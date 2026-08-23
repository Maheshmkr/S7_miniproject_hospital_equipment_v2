import PurchaseOrder, { PO_PRIORITIES, PO_STATUSES } from "../models/PurchaseOrder.js";
import Vendor from "../models/Vendor.js";
import Department from "../models/Department.js";
import Equipment from "../models/Equipment.js";
import AuditLog from "../models/AuditLog.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode } from "../services/lifecycleService.js";
import { assertTransition, computeTotals, isLocked, money, priceItems } from "../services/purchaseOrderService.js";

const escape = (v) => String(v).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rx = (v) => new RegExp(escape(v), "i");

const POPULATE = [
  { path: "vendorId", select: "vendorId name category status email phone" },
  { path: "departmentId", select: "code name" },
  { path: "requestedBy", select: "name email role" },
  { path: "approvedBy", select: "name email role" },
  { path: "rejectedBy", select: "name email role" },
];

/** Actions that move a PO into a new state, mapped to their audit action name. */
const STATUS_ACTIONS = {
  PENDING_APPROVAL: "PO_SUBMITTED",
  APPROVED: "PO_APPROVED",
  REJECTED: "PO_REJECTED",
  ORDERED: "PO_ORDERED",
  PARTIALLY_RECEIVED: "PO_PARTIALLY_RECEIVED",
  RECEIVED: "PO_RECEIVED",
  CANCELLED: "PO_CANCELLED",
  DRAFT: "PO_REOPENED",
};

/** Department staff only ever see their own department's orders. */
function scopeFilter(user) {
  if (user.role === "DEPARTMENT_STAFF") {
    return { departmentId: user.departmentId ?? null };
  }
  return {};
}

function assertReadAccess(po, user) {
  if (user.role !== "DEPARTMENT_STAFF") return;
  const dept = String(po.departmentId?._id || po.departmentId || "");
  if (!user.departmentId || dept !== String(user.departmentId)) {
    throw new ApiError(403, "You do not have access to this purchase order");
  }
}

async function resolveVendor(value) {
  if (!value) throw new ApiError(400, "vendorId is required");
  const vendor = await findByAnyId(Vendor, value, "vendorId");
  if (!vendor) throw new ApiError(404, "Vendor not found");
  if (vendor.status !== "ACTIVE") {
    throw new ApiError(400, `Vendor ${vendor.vendorId} is ${vendor.status} and cannot receive new orders`);
  }
  return vendor;
}

async function resolveDepartment(value, user) {
  if (!value) {
    return user.role === "DEPARTMENT_STAFF" ? user.departmentId ?? null : null;
  }
  const department = await findByAnyId(Department, value, "code");
  if (!department) throw new ApiError(404, "Department not found");
  if (user.role === "DEPARTMENT_STAFF" && String(department._id) !== String(user.departmentId)) {
    throw new ApiError(403, "You can only raise purchase orders for your own department");
  }
  return department._id;
}

/** Line items may reference an existing asset; the asset itself is never mutated here. */
async function resolveItemEquipment(items) {
  return Promise.all(
    items.map(async (item) => {
      if (!item.equipmentId) return { ...item, equipmentId: undefined };
      const equipment = await findByAnyId(Equipment, item.equipmentId, "equipmentId");
      if (!equipment) throw new ApiError(404, `Equipment ${item.equipmentId} not found`);
      return { ...item, equipmentId: equipment._id };
    }),
  );
}

const load = async (id) => {
  const po = await findByAnyId(PurchaseOrder, id, "purchaseOrderId");
  if (!po) throw new ApiError(404, "Purchase order not found");
  return po;
};

const withRefs = (po) => po.populate(POPULATE);

/* ---------------------------------- Reads ---------------------------------- */

export const listPurchaseOrders = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const { status, priority, vendorId, departmentId, poNumber, from, to, search } = req.query;
  const filter = { ...scopeFilter(req.user) };

  if (status) {
    const value = String(status).toUpperCase();
    assertEnum(value, PO_STATUSES, "status");
    filter.status = value;
  }
  if (priority) {
    const value = String(priority).toUpperCase();
    assertEnum(value, PO_PRIORITIES, "priority");
    filter.priority = value;
  }
  if (vendorId) {
    const vendor = await findByAnyId(Vendor, vendorId, "vendorId");
    filter.vendorId = vendor?._id ?? null;
  }
  if (departmentId && req.user.role !== "DEPARTMENT_STAFF") {
    const department = await findByAnyId(Department, departmentId, "code");
    filter.departmentId = department?._id ?? null;
  }
  if (poNumber) filter.$and = [{ $or: [{ poNumber: rx(poNumber) }, { purchaseOrderId: rx(poNumber) }] }];
  const fromDate = assertDate(from, "from");
  const toDate = assertDate(to, "to");
  if (fromDate || toDate) {
    filter.orderDate = { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) };
  }
  if (search) {
    filter.$or = [
      { purchaseOrderId: rx(search) },
      { poNumber: rx(search) },
      { title: rx(search) },
      { notes: rx(search) },
      { "items.description": rx(search) },
      { "items.itemCode": rx(search) },
    ];
  }

  const [items, total] = await Promise.all([
    PurchaseOrder.find(filter).populate(POPULATE).sort({ orderDate: -1, createdAt: -1 }).skip(skip).limit(limit),
    PurchaseOrder.countDocuments(filter),
  ]);
  return ok(res, { items, total, page, limit });
});

export const purchaseOrderStats = asyncHandler(async (req, res) => {
  const docs = await PurchaseOrder.find(scopeFilter(req.user)).select("status totalAmount").lean();
  const byStatus = Object.fromEntries(PO_STATUSES.map((s) => [s, 0]));
  let committedValue = 0;
  for (const po of docs) {
    byStatus[po.status] = (byStatus[po.status] || 0) + 1;
    if (["APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED"].includes(po.status)) {
      committedValue += po.totalAmount || 0;
    }
  }
  return ok(res, {
    total: docs.length,
    pendingApproval: byStatus.PENDING_APPROVAL,
    approved: byStatus.APPROVED,
    ordered: byStatus.ORDERED,
    received: byStatus.RECEIVED,
    committedValue: money(committedValue),
    byStatus,
  });
});

export const getPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await withRefs(await load(req.params.id));
  assertReadAccess(po, req.user);
  return ok(res, po);
});

export const purchaseOrderHistory = asyncHandler(async (req, res) => {
  const po = await withRefs(await load(req.params.id));
  assertReadAccess(po, req.user);
  const logs = await AuditLog.find({ module: "PurchaseOrder", recordId: po.purchaseOrderId })
    .sort({ timestamp: -1 })
    .limit(200);
  return ok(res, { purchaseOrder: po, logs });
});

/* --------------------------------- Writes --------------------------------- */

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  requireFields(req.body, ["vendorId"]);
  const vendor = await resolveVendor(req.body.vendorId);
  const departmentId = await resolveDepartment(req.body.departmentId, req.user);

  const items = await resolveItemEquipment(priceItems(req.body.items));
  const totals = computeTotals(items, req.body.shippingCost);

  assertEnum(req.body.priority && String(req.body.priority).toUpperCase(), PO_PRIORITIES, "priority");
  const requestedStatus = req.body.status ? String(req.body.status).toUpperCase() : "DRAFT";
  assertEnum(requestedStatus, PO_STATUSES, "status");
  if (!["DRAFT", "PENDING_APPROVAL"].includes(requestedStatus)) {
    throw new ApiError(422, "A new purchase order can only start as DRAFT or PENDING_APPROVAL");
  }

  const purchaseOrderId = await nextCode(PurchaseOrder, "purchaseOrderId", "PO-", 4);
  const po = await PurchaseOrder.create({
    purchaseOrderId,
    poNumber: req.body.poNumber?.trim() || purchaseOrderId,
    vendorId: vendor._id,
    departmentId,
    requestedBy: req.user._id,
    title: req.body.title?.trim(),
    orderDate: assertDate(req.body.orderDate, "orderDate") || new Date(),
    expectedDeliveryDate: assertDate(req.body.expectedDeliveryDate, "expectedDeliveryDate"),
    status: requestedStatus,
    priority: req.body.priority ? String(req.body.priority).toUpperCase() : "MEDIUM",
    items,
    ...totals,
    currency: req.body.currency?.trim() || "USD",
    paymentTerms: req.body.paymentTerms?.trim(),
    deliveryAddress: req.body.deliveryAddress?.trim(),
    notes: req.body.notes?.trim(),
  });

  await logAudit({
    user: req.user,
    action: "PO_CREATED",
    module: "PurchaseOrder",
    recordId: po.purchaseOrderId,
    newStatus: po.status,
    description: `${po.purchaseOrderId} raised with ${vendor.name} for ${po.currency} ${po.totalAmount}`,
    metadata: { totalAmount: po.totalAmount, itemCount: po.items.length },
  });
  return created(res, await withRefs(po));
});

export const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await load(req.params.id);
  if (isLocked(po.status)) {
    throw new ApiError(422, `A ${po.status} purchase order can no longer be edited`);
  }
  if (req.user.role === "BIOMEDICAL_ENGINEER" && String(po.requestedBy) !== String(req.user._id)) {
    throw new ApiError(403, "Engineers may only edit purchase orders they raised");
  }

  if (req.body.vendorId) po.vendorId = (await resolveVendor(req.body.vendorId))._id;
  if (req.body.departmentId) po.departmentId = await resolveDepartment(req.body.departmentId, req.user);
  if (req.body.priority) {
    const priority = String(req.body.priority).toUpperCase();
    assertEnum(priority, PO_PRIORITIES, "priority");
    po.priority = priority;
  }
  for (const field of ["title", "poNumber", "paymentTerms", "deliveryAddress", "notes", "currency"]) {
    if (req.body[field] !== undefined) po[field] = String(req.body[field]).trim();
  }
  for (const field of ["orderDate", "expectedDeliveryDate"]) {
    if (req.body[field] !== undefined) po[field] = assertDate(req.body[field], field);
  }

  if (req.body.items !== undefined || req.body.shippingCost !== undefined) {
    const items = req.body.items !== undefined
      ? await resolveItemEquipment(priceItems(req.body.items))
      : po.items.toObject();
    const totals = computeTotals(items, req.body.shippingCost ?? po.shippingCost);
    po.items = items;
    Object.assign(po, totals);
  }

  await po.save();
  await logAudit({
    user: req.user,
    action: "PO_UPDATED",
    module: "PurchaseOrder",
    recordId: po.purchaseOrderId,
    newStatus: po.status,
    description: `${po.purchaseOrderId} updated — total ${po.currency} ${po.totalAmount}`,
  });
  return ok(res, await withRefs(po));
});

async function transition(po, status, user, { reason } = {}) {
  assertTransition(po.status, status);
  const previous = po.status;
  if (previous === status) return po;

  if (status === "APPROVED" || status === "REJECTED") {
    if (user.role !== "ADMINISTRATOR") throw new ApiError(403, "Only administrators can approve or reject");
    if (String(po.requestedBy) === String(user._id)) {
      throw new ApiError(403, "You cannot approve or reject a purchase order you raised yourself");
    }
    if (previous !== "PENDING_APPROVAL") {
      throw new ApiError(422, "Only purchase orders pending approval can be approved or rejected");
    }
  }
  if (status === "APPROVED") {
    po.approvedBy = user._id;
    po.approvedAt = new Date();
  }
  if (status === "REJECTED") {
    po.rejectedBy = user._id;
    po.rejectedAt = new Date();
    po.rejectionReason = reason?.trim() || undefined;
  }
  if (status === "RECEIVED") po.deliveryDate = new Date();

  po.status = status;
  await po.save();
  await logAudit({
    user,
    action: STATUS_ACTIONS[status] || "PO_STATUS_CHANGED",
    module: "PurchaseOrder",
    recordId: po.purchaseOrderId,
    previousStatus: previous,
    newStatus: status,
    description: `${po.purchaseOrderId} moved ${previous} → ${status}${reason ? ` · ${reason}` : ""}`,
  });
  return po;
}

export const updatePurchaseOrderStatus = asyncHandler(async (req, res) => {
  requireFields(req.body, ["status"]);
  const status = String(req.body.status).toUpperCase();
  assertEnum(status, PO_STATUSES, "status");
  const po = await load(req.params.id);
  assertReadAccess(po, req.user);
  if (req.user.role === "DEPARTMENT_STAFF") {
    throw new ApiError(403, "Department staff cannot change purchase order status");
  }
  await transition(po, status, req.user, { reason: req.body.reason });
  return ok(res, await withRefs(po));
});

export const approvePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await load(req.params.id);
  await transition(po, "APPROVED", req.user, { reason: req.body?.reason });
  return ok(res, await withRefs(po));
});

export const rejectPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await load(req.params.id);
  await transition(po, "REJECTED", req.user, { reason: req.body?.reason });
  return ok(res, await withRefs(po));
});

export const deletePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await load(req.params.id);
  if (po.status !== "DRAFT") {
    throw new ApiError(
      422,
      `Only DRAFT purchase orders can be deleted. Cancel ${po.purchaseOrderId} instead of deleting it.`,
    );
  }
  await po.deleteOne();
  await logAudit({
    user: req.user,
    action: "PO_DELETED",
    module: "PurchaseOrder",
    recordId: po.purchaseOrderId,
    previousStatus: po.status,
    description: `${po.purchaseOrderId} draft removed`,
  });
  return ok(res, { deleted: po.purchaseOrderId });
});
