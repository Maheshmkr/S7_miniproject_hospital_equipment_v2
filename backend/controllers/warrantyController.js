import Equipment from "../models/Equipment.js";
import Warranty, { WARRANTY_EXPIRING_DAYS, WARRANTY_KINDS, warrantyState } from "../models/Warranty.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode } from "../services/lifecycleService.js";
import { loadEquipment } from "./equipmentController.js";
import Vendor from "../models/Vendor.js";
import AuditLog from "../models/AuditLog.js";

const POPULATE = [
  { path: "equipmentId", select: "equipmentId name category departmentId status" },
  { path: "vendorId", select: "vendorId name category email phone status" },
  { path: "departmentId", select: "code name" },
];

/**
 * Vendor may arrive as a Vendor _id, a VEN- code, or nothing at all.
 * Legacy records keep their free-text `vendor` string untouched.
 */
async function resolveVendor(body) {
  if (body.vendorId === undefined || body.vendorId === null || body.vendorId === "") {
    return { ...(body.vendorId === "" ? { vendorId: null } : {}) };
  }
  const vendor = await findByAnyId(Vendor, body.vendorId, "vendorId");
  if (!vendor) throw new ApiError(404, "Vendor not found");
  return { vendorId: vendor._id, vendor: body.vendor || vendor.name };
}

/** Attach the derived lifecycle state; never persisted apart from CANCELLED. */
const withStatus = (doc) => {
  const json = typeof doc.toJSON === "function" ? doc.toJSON() : doc;
  const state = warrantyState(json);
  return { ...json, status: state.status, daysRemaining: state.daysRemaining };
};

/** Resolve the department ids visible to the caller (staff + engineers are scoped). */
async function scopedEquipmentFilter(req, filter) {
  const role = req.user.role;
  const deptId = req.query.departmentId || (role === "ADMINISTRATOR" ? null : req.user.departmentId);
  if (role === "ADMINISTRATOR" && !req.query.departmentId) return filter;
  if (!deptId) return filter;
  const ids = await Equipment.find({ departmentId: deptId }).distinct("_id");
  return { ...filter, $or: [{ departmentId: deptId }, { equipmentId: { $in: ids } }] };
}

async function buildFilter(req) {
  const { kind, equipmentId, vendor, status, search, from, to } = req.query;
  const filter = {};
  if (kind) {
    assertEnum(String(kind).toUpperCase(), WARRANTY_KINDS, "kind");
    filter.kind = String(kind).toUpperCase();
  }
  if (equipmentId) {
    const eq = await findByAnyId(Equipment, equipmentId, "equipmentId");
    if (!eq) throw new ApiError(404, "Equipment not found");
    filter.equipmentId = eq._id;
  }
  if (vendor) filter.vendor = new RegExp(vendor, "i");
  const fromDate = assertDate(from, "from date");
  const toDate = assertDate(to, "to date");
  if (fromDate || toDate) {
    filter.endDate = { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) };
  }
  if (search) {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { warrantyId: new RegExp(search, "i") },
          { vendor: new RegExp(search, "i") },
          { contractNumber: new RegExp(search, "i") },
          { coverage: new RegExp(search, "i") },
        ],
      },
    ];
  }
  const scoped = await scopedEquipmentFilter(req, filter);
  // `status` is derived, so it is applied after the query in listWarranties.
  if (status && status === "CANCELLED") scoped.status = "CANCELLED";
  return scoped;
}

export const listWarranties = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = await buildFilter(req);
  const docs = await Warranty.find(filter).populate(POPULATE).sort({ endDate: 1 });
  let items = docs.map(withStatus);
  if (req.query.status && req.query.status !== "CANCELLED") {
    items = items.filter((w) => w.status === String(req.query.status).toUpperCase());
  }
  const total = items.length;
  return ok(res, { items: items.slice(skip, skip + limit), total, page, limit });
});

export const warrantyStats = asyncHandler(async (req, res) => {
  const filter = await buildFilter(req);
  const docs = await Warranty.find(filter).lean();
  const counters = { total: docs.length, active: 0, expiring: 0, expired: 0, cancelled: 0, equipmentCovered: 0 };
  const equipment = new Set();
  for (const doc of docs) {
    const { status } = warrantyState(doc);
    if (status === "ACTIVE") counters.active += 1;
    if (status === "EXPIRING") counters.expiring += 1;
    if (status === "EXPIRED") counters.expired += 1;
    if (status === "CANCELLED") counters.cancelled += 1;
    if (status !== "EXPIRED" && status !== "CANCELLED") equipment.add(String(doc.equipmentId));
  }
  counters.equipmentCovered = equipment.size;
  return ok(res, { ...counters, expiringWindowDays: WARRANTY_EXPIRING_DAYS });
});

async function loadWarrantyForRequest(req) {
  const w = await findByAnyId(Warranty, req.params.id, "warrantyId");
  if (!w) throw new ApiError(404, "Warranty not found");
  await w.populate(POPULATE);
  if (req.user.role !== "ADMINISTRATOR" && req.user.departmentId) {
    const eqDept = w.equipmentId?.departmentId ? String(w.equipmentId.departmentId) : null;
    const own = String(req.user.departmentId);
    const wDept = w.departmentId?._id ? String(w.departmentId._id) : null;
    if (eqDept && eqDept !== own && wDept !== own) {
      throw new ApiError(403, "This contract belongs to another department");
    }
  }
  return w;
}

export const getWarranty = asyncHandler(async (req, res) => {
  const w = await loadWarrantyForRequest(req);
  return ok(res, withStatus(w));
});

export const warrantyHistory = asyncHandler(async (req, res) => {
  const w = await loadWarrantyForRequest(req);
  const logs = await AuditLog.find({ module: "Warranty", recordId: w.warrantyId }).sort({ timestamp: -1 }).limit(200);
  return ok(res, { warranty: withStatus(w), logs });
});

export const createWarranty = asyncHandler(async (req, res) => {
  requireFields(req.body, ["equipmentId", "startDate", "endDate"]);
  const equipment = await loadEquipment(req.body.equipmentId);
  const kind = (req.body.kind || "WARRANTY").toUpperCase();
  assertEnum(kind, WARRANTY_KINDS, "kind");
  const startDate = assertDate(req.body.startDate, "startDate");
  const endDate = assertDate(req.body.endDate, "endDate");
  if (endDate <= startDate) throw new ApiError(400, "endDate must be after startDate");

  // One active contract of the same kind per asset.
  const existing = await Warranty.find({ equipmentId: equipment._id, kind, status: { $ne: "CANCELLED" } });
  if (existing.some((w) => warrantyState(w).status !== "EXPIRED" && new Date(w.endDate) > startDate)) {
    throw new ApiError(409, `${equipment.equipmentId} already has an active ${kind} contract`);
  }

  const vendorLink = await resolveVendor(req.body);
  const w = await Warranty.create({
    ...req.body,
    ...vendorLink,
    kind,
    equipmentId: equipment._id,
    departmentId: equipment.departmentId,
    createdBy: req.user?._id,
    status: "ACTIVE",
    startDate,
    endDate,
    warrantyId: req.body.warrantyId || (await nextCode(Warranty, "warrantyId", kind === "AMC" ? "AMC-" : "WR-", 4)),
  });
  if (kind === "AMC") equipment.amcId = w._id;
  else {
    equipment.warrantyId = w._id;
    equipment.warrantyExpiry = endDate;
  }
  await equipment.save();
  await logAudit({ user: req.user, action: "WARRANTY_CREATED", module: "Warranty", recordId: w.warrantyId, equipmentId: equipment._id, description: `${w.warrantyId} registered` });
  await w.populate(POPULATE);
  return created(res, withStatus(w));
});

const PROTECTED_FIELDS = ["warrantyId", "equipmentId", "createdBy", "_id"];

export const updateWarranty = asyncHandler(async (req, res) => {
  const w = await loadWarrantyForRequest(req);
  const previous = warrantyState(w).status;
  const payload = { ...req.body };
  for (const field of PROTECTED_FIELDS) delete payload[field];
  if (req.user.role !== "ADMINISTRATOR") {
    // Engineers may only annotate service information.
    for (const key of Object.keys(payload)) {
      if (!["coverage", "notes", "terms"].includes(key)) delete payload[key];
    }
  }
  if ("vendorId" in payload) Object.assign(payload, await resolveVendor(payload));
  if (payload.startDate) payload.startDate = assertDate(payload.startDate, "startDate");
  if (payload.endDate) payload.endDate = assertDate(payload.endDate, "endDate");
  if (payload.status) assertEnum(payload.status, ["ACTIVE", "CANCELLED"], "status");
  Object.assign(w, payload);
  if (w.endDate <= w.startDate) throw new ApiError(400, "endDate must be after startDate");
  await w.save();
  const nextStatus = warrantyState(w).status;
  await logAudit({
    user: req.user,
    action: payload.status === "CANCELLED" ? "WARRANTY_CANCELLED" : "WARRANTY_UPDATED",
    module: "Warranty",
    recordId: w.warrantyId,
    equipmentId: w.equipmentId?._id || w.equipmentId,
    previousStatus: previous,
    newStatus: nextStatus,
    description: `${w.warrantyId} ${payload.status === "CANCELLED" ? "cancelled" : "updated"}`,
  });
  return ok(res, withStatus(w));
});

export const deleteWarranty = asyncHandler(async (req, res) => {
  const w = await findByAnyId(Warranty, req.params.id, "warrantyId");
  if (!w) throw new ApiError(404, "Warranty not found");
  await Equipment.updateMany({ warrantyId: w._id }, { $unset: { warrantyId: "" } });
  await Equipment.updateMany({ amcId: w._id }, { $unset: { amcId: "" } });
  await w.deleteOne();
  await logAudit({
    user: req.user,
    action: "WARRANTY_DELETED",
    module: "Warranty",
    recordId: w.warrantyId,
    equipmentId: w.equipmentId,
    description: `${w.warrantyId} removed from the contract register`,
  });
  return ok(res, { deleted: w.warrantyId });
});
