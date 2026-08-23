import Vendor, { VENDOR_CATEGORIES, VENDOR_STATUSES } from "../models/Vendor.js";
import Warranty from "../models/Warranty.js";
import Equipment from "../models/Equipment.js";
import AuditLog from "../models/AuditLog.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertEmail, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode } from "../services/lifecycleService.js";

const escape = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rx = (v) => new RegExp(escape(v), "i");
/** Anchored, case-insensitive match — anchors must not be escaped away. */
const exactRx = (v) => new RegExp(`^${escape(v)}$`, "i");

/** Fields an engineer may annotate; everything else is administrator-only. */
const ENGINEER_EDITABLE = ["notes", "specialization", "contactPerson", "phone", "alternatePhone", "email", "rating"];
const PROTECTED_FIELDS = ["vendorId", "_id", "createdBy", "createdAt", "updatedAt"];

function normalise(body) {
  const payload = { ...body };
  for (const field of PROTECTED_FIELDS) delete payload[field];
  if (payload.category) {
    payload.category = String(payload.category).toUpperCase();
    assertEnum(payload.category, VENDOR_CATEGORIES, "category");
  }
  if (payload.status) {
    payload.status = String(payload.status).toUpperCase();
    assertEnum(payload.status, VENDOR_STATUSES, "status");
  }
  if (payload.email) assertEmail(payload.email);
  if (payload.phone && !/^[+\d][\d\s\-()]{5,}$/.test(String(payload.phone))) {
    throw new ApiError(400, "Invalid phone number");
  }
  if (payload.rating !== undefined && payload.rating !== "") {
    const rating = Number(payload.rating);
    if (Number.isNaN(rating) || rating < 0 || rating > 5) throw new ApiError(400, "rating must be between 0 and 5");
    payload.rating = rating;
  }
  return payload;
}

export const listVendors = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { name, vendorCode, category, status, city, state, specialization, search } = req.query;
  const filter = {};
  if (name) filter.name = rx(name);
  if (vendorCode) filter.vendorId = rx(vendorCode);
  if (city) filter.city = rx(city);
  if (state) filter.state = rx(state);
  if (specialization) filter.specialization = rx(specialization);
  if (category) {
    const value = String(category).toUpperCase();
    assertEnum(value, VENDOR_CATEGORIES, "category");
    filter.category = value;
  }
  if (status) {
    const value = String(status).toUpperCase();
    assertEnum(value, VENDOR_STATUSES, "status");
    filter.status = value;
  }
  if (search) {
    filter.$or = [
      { vendorId: rx(search) },
      { name: rx(search) },
      { legalName: rx(search) },
      { specialization: rx(search) },
      { contactPerson: rx(search) },
      { email: rx(search) },
      { city: rx(search) },
    ];
  }
  const [items, total] = await Promise.all([
    Vendor.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Vendor.countDocuments(filter),
  ]);
  return ok(res, { items, total, page, limit });
});

export const vendorStats = asyncHandler(async (_req, res) => {
  const docs = await Vendor.find().select("status category").lean();
  const byCategory = {};
  const counters = { total: docs.length, active: 0, inactive: 0, suspended: 0 };
  for (const v of docs) {
    if (v.status === "ACTIVE") counters.active += 1;
    if (v.status === "INACTIVE") counters.inactive += 1;
    if (v.status === "SUSPENDED") counters.suspended += 1;
    byCategory[v.category] = (byCategory[v.category] || 0) + 1;
  }
  return ok(res, { ...counters, byCategory });
});

async function loadVendor(id) {
  const vendor = await findByAnyId(Vendor, id, "vendorId");
  if (!vendor) throw new ApiError(404, "Vendor not found");
  return vendor;
}

/** Records that point at this vendor, by reference or by legacy vendor string. */
async function vendorReferences(vendor) {
  const [warranties, equipment] = await Promise.all([
    Warranty.find({ $or: [{ vendorId: vendor._id }, { vendor: vendor.name }] })
      .select("warrantyId kind vendor vendorId equipmentId startDate endDate status")
      .populate({ path: "equipmentId", select: "equipmentId name" })
      .sort({ endDate: 1 })
      .limit(100),
    Equipment.find({ $or: [{ vendorRef: vendor._id }, { vendor: vendor.name }] })
      .select("equipmentId name category status departmentId")
      .limit(100),
  ]);
  return { warranties, equipment };
}

export const getVendor = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req.params.id);
  const { warranties, equipment } = await vendorReferences(vendor);
  return ok(res, { vendor, warranties, equipment });
});

export const vendorHistory = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req.params.id);
  const logs = await AuditLog.find({ module: "Vendor", recordId: vendor.vendorId }).sort({ timestamp: -1 }).limit(200);
  return ok(res, { vendor, logs });
});

export const createVendor = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name"]);
  const payload = normalise(req.body);
  const requestedCode = req.body.vendorId || req.body.vendorCode;
  if (requestedCode && (await Vendor.findOne({ vendorId: requestedCode }))) {
    throw new ApiError(409, `Vendor code ${requestedCode} is already in use`);
  }
  if (await Vendor.findOne({ name: exactRx(payload.name) })) {
    throw new ApiError(409, `A vendor named "${payload.name}" already exists`);
  }
  const vendor = await Vendor.create({
    ...payload,
    vendorId: requestedCode || (await nextCode(Vendor, "vendorId", "VEN-", 4)),
    createdBy: req.user?._id,
  });
  await logAudit({
    user: req.user,
    action: "VENDOR_CREATED",
    module: "Vendor",
    recordId: vendor.vendorId,
    newStatus: vendor.status,
    description: `${vendor.vendorId} · ${vendor.name} added to the vendor register`,
  });
  return created(res, vendor);
});

export const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req.params.id);
  const payload = normalise(req.body);
  if (req.user.role !== "ADMINISTRATOR") {
    for (const key of Object.keys(payload)) {
      if (!ENGINEER_EDITABLE.includes(key)) delete payload[key];
    }
  }
  if (payload.name && payload.name !== vendor.name) {
    const clash = await Vendor.findOne({ name: exactRx(payload.name), _id: { $ne: vendor._id } });
    if (clash) throw new ApiError(409, `A vendor named "${payload.name}" already exists`);
  }
  const previous = vendor.status;
  Object.assign(vendor, payload);
  await vendor.save();
  await logAudit({
    user: req.user,
    action: "VENDOR_UPDATED",
    module: "Vendor",
    recordId: vendor.vendorId,
    previousStatus: previous,
    newStatus: vendor.status,
    description: `${vendor.vendorId} updated`,
  });
  return ok(res, vendor);
});

export const updateVendorStatus = asyncHandler(async (req, res) => {
  requireFields(req.body, ["status"]);
  const status = String(req.body.status).toUpperCase();
  assertEnum(status, VENDOR_STATUSES, "status");
  const vendor = await loadVendor(req.params.id);
  const previous = vendor.status;
  if (previous === status) return ok(res, vendor);
  vendor.status = status;
  await vendor.save();
  await logAudit({
    user: req.user,
    action: "VENDOR_STATUS_CHANGED",
    module: "Vendor",
    recordId: vendor.vendorId,
    previousStatus: previous,
    newStatus: status,
    description: `${vendor.vendorId} moved from ${previous} to ${status}`,
  });
  return ok(res, vendor);
});

export const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await loadVendor(req.params.id);
  const { warranties, equipment } = await vendorReferences(vendor);
  if (warranties.length || equipment.length) {
    throw new ApiError(
      409,
      `${vendor.vendorId} is referenced by ${warranties.length} contract(s) and ${equipment.length} asset(s). Set the vendor to INACTIVE instead of deleting it.`,
    );
  }
  await vendor.deleteOne();
  await logAudit({
    user: req.user,
    action: "VENDOR_DELETED",
    module: "Vendor",
    recordId: vendor.vendorId,
    previousStatus: vendor.status,
    description: `${vendor.vendorId} · ${vendor.name} removed from the vendor register`,
  });
  return ok(res, { deleted: vendor.vendorId });
});
