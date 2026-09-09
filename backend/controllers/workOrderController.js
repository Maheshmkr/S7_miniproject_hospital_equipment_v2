import WorkOrder, { MAINTENANCE_TYPES, WORK_ORDER_STATUSES, WORK_ORDER_TRANSITIONS } from "../models/WorkOrder.js";
import Department from "../models/Department.js";
import Maintenance from "../models/Maintenance.js";
import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode, setComplaintStatus, setEquipmentStatus } from "../services/lifecycleService.js";
import { loadEquipment } from "./equipmentController.js";

export const loadWorkOrder = async (id) => {
  const wo = await findByAnyId(WorkOrder, id, "workOrderId");
  if (!wo) throw new ApiError(404, "Work order not found");
  return wo;
};

const populateContext = (query) =>
  query
    .populate("equipmentId")
    .populate("complaintId")
    .populate("departmentId", "name code")
    .populate("engineerId", "name initials email title");

const sameId = (a, b) => Boolean(a && b && String(a) === String(b));

/**
 * Department staff only reach their own department's orders; engineers reach the
 * ones assigned to them or raised in their department. Administrators reach everything.
 */
function assertWorkOrderAccess(wo, user) {
  if (!user) throw new ApiError(401, "Authentication required");
  if (user.role === "ADMINISTRATOR" || user.role === "DEPARTMENT_STAFF") return;
  if (user.role === "BIOMEDICAL_ENGINEER") {
    if (sameId(wo.engineerId, user._id) || sameId(wo.createdBy, user._id)) return;
    throw new ApiError(403, "This work order is not assigned to you");
  }
}

/** Fields a caller may change through PUT — never ids, creator or status. */
const EDITABLE = ["title", "description", "priority", "maintenanceType", "scheduledDate", "estimatedHours"];

/** Validate an engineer before assignment: exists, correct role, active. */
async function loadAssignableEngineer(engineerId) {
  const engineer = await User.findById(engineerId).catch(() => null);
  if (!engineer) throw new ApiError(404, "Engineer not found");
  if (engineer.role !== "BIOMEDICAL_ENGINEER") throw new ApiError(400, "Assignee must be a biomedical engineer");
  if (engineer.status !== "ACTIVE") throw new ApiError(422, "Engineer account is not active");
  return engineer;
}

function assertTransition(from, to) {
  const allowed = WORK_ORDER_TRANSITIONS[from] || [];
  if (from === to) return;
  if (!allowed.includes(to)) throw new ApiError(422, `Work order cannot move ${from} → ${to}`);
}

export const listWorkOrders = asyncHandler(async (req, res) => {
  const { status, priority, engineerId, equipmentId, complaintId, departmentId, maintenanceType, search, from, to } =
    req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (engineerId) filter.engineerId = engineerId;
  if (equipmentId) filter.equipmentId = equipmentId;
  if (complaintId) filter.complaintId = complaintId;
  if (departmentId) filter.departmentId = departmentId;
  if (maintenanceType) filter.maintenanceType = maintenanceType;
  const fromDate = assertDate(from, "from date");
  const toDate = assertDate(to, "to date");
  if (fromDate || toDate) {
    filter.scheduledDate = { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) };
  }
  if (search) {
    filter.$or = [
      { title: new RegExp(search, "i") },
      { workOrderId: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
    ];
  }
  if (req.user.role === "DEPARTMENT_STAFF" && req.user.departmentId) filter.departmentId = req.user.departmentId;
  if (req.user.role === "BIOMEDICAL_ENGINEER") {
    filter.engineerId = req.user._id;
  }

  const [items, total] = await Promise.all([
    populateContext(WorkOrder.find(filter)).sort({ createdAt: -1 }).skip(skip).limit(limit),
    WorkOrder.countDocuments(filter),
  ]);
  return ok(res, { items, total, page, limit });
});

/** Assigned Tasks for the signed-in engineer. */
export const myWorkOrders = asyncHandler(async (req, res) => {
  const filter = { engineerId: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const items = await populateContext(WorkOrder.find(filter)).sort({ scheduledDate: 1, createdAt: -1 });
  return ok(res, { items, total: items.length });
});

/**
 * Full work order context — workOrder + equipment + complaint + department + engineer.
 * Never returns unrelated equipment: everything is resolved from this work order's ids.
 */
export const getWorkOrder = asyncHandler(async (req, res) => {
  const wo = await loadWorkOrder(req.params.id);
  assertWorkOrderAccess(wo, req.user);
  const full = await populateContext(WorkOrder.findById(wo._id));
  const maintenance = await Maintenance.findOne({ workOrderId: wo._id }).sort({ createdAt: -1 });
  return ok(res, {
    workOrder: full,
    equipment: full.equipmentId,
    complaint: full.complaintId,
    department: full.departmentId,
    engineer: full.engineerId,
    maintenance,
  });
});

export const createWorkOrder = asyncHandler(async (req, res) => {
  requireFields(req.body, ["title", "equipmentId"]);
  assertEnum(req.body.maintenanceType, MAINTENANCE_TYPES, "maintenanceType");
  const equipment = await loadEquipment(req.body.equipmentId);
  if (req.body.priority) assertEnum(req.body.priority, ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "priority");
  if (req.body.status) assertEnum(req.body.status, WORK_ORDER_STATUSES, "status");
  let complaint = null;
  if (req.body.complaintId) {
    complaint = await findByAnyId(Complaint, req.body.complaintId, "complaintId");
    if (!complaint) throw new ApiError(404, "Linked complaint not found");
    if (String(complaint.equipmentId) !== String(equipment._id)) {
      throw new ApiError(422, "Complaint does not belong to this equipment");
    }
    const existing = await WorkOrder.findOne({ complaintId: complaint._id, status: { $ne: "CANCELLED" } });
    if (existing) throw new ApiError(409, `${complaint.complaintId} already has work order ${existing.workOrderId}`);
  }

  const departmentId = req.body.departmentId || complaint?.departmentId || equipment.departmentId;
  if (req.body.departmentId) {
    const dept = await Department.findById(req.body.departmentId).catch(() => null);
    if (!dept) throw new ApiError(404, "Department not found");
  }
  if (req.user.role === "DEPARTMENT_STAFF") {
    if (!req.user.departmentId || String(departmentId) !== String(req.user.departmentId)) {
      throw new ApiError(403, "You can only raise work orders for your own department");
    }
  }
  const engineer = req.body.engineerId ? await loadAssignableEngineer(req.body.engineerId) : null;

  const wo = await WorkOrder.create({
    workOrderId: req.body.workOrderId || (await nextCode(WorkOrder, "workOrderId", "WO-", 4)),
    title: req.body.title,
    equipmentId: equipment._id,
    complaintId: complaint?._id,
    departmentId,
    engineerId: engineer?._id || complaint?.assignedEngineerId,
    maintenanceType: req.body.maintenanceType || "CORRECTIVE",
    priority: req.body.priority || complaint?.priority || "MEDIUM",
    scheduledDate: assertDate(req.body.scheduledDate, "scheduledDate"),
    estimatedHours: req.body.estimatedHours != null ? Number(req.body.estimatedHours) : undefined,
    description: req.body.description,
    createdBy: req.user._id,
  });

  if (complaint) {
    complaint.workOrderId = wo._id;
    if (wo.engineerId) {
      complaint.assignedEngineerId = wo.engineerId;
      if (complaint.status === "OPEN" || complaint.status === "UNDER_REVIEW") {
        complaint.status = "ASSIGNED";
      }
    }
    await complaint.save();
  }

  await logAudit({
    user: req.user,
    action: "WORK_ORDER_CREATED",
    module: "WorkOrder",
    recordId: wo.workOrderId,
    equipmentId: equipment._id,
    workOrderId: wo._id,
    newStatus: wo.status,
    description: `${wo.workOrderId} · ${wo.title}`,
  });
  return created(res, wo);
});

export const updateWorkOrder = asyncHandler(async (req, res) => {
  const wo = await loadWorkOrder(req.params.id);
  assertWorkOrderAccess(wo, req.user);
  for (const field of EDITABLE) {
    if (req.body[field] === undefined) continue;
    if (field === "scheduledDate") wo.scheduledDate = assertDate(req.body.scheduledDate, "scheduledDate");
    else if (field === "estimatedHours") wo.estimatedHours = Number(req.body.estimatedHours);
    else if (field === "priority") {
      assertEnum(req.body.priority, ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "priority");
      wo.priority = req.body.priority;
    } else if (field === "maintenanceType") {
      assertEnum(req.body.maintenanceType, MAINTENANCE_TYPES, "maintenanceType");
      wo.maintenanceType = req.body.maintenanceType;
    } else wo[field] = req.body[field];
  }
  await wo.save();
  await logAudit({ user: req.user, action: "WORK_ORDER_UPDATED", module: "WorkOrder", recordId: wo.workOrderId, workOrderId: wo._id, equipmentId: wo.equipmentId, description: `${wo.workOrderId} updated` });
  return ok(res, wo);
});

/** Legal next statuses for the current state — drives status controls in the UI. */
export const workOrderTransitions = asyncHandler(async (req, res) => {
  const wo = await loadWorkOrder(req.params.id);
  assertWorkOrderAccess(wo, req.user);
  return ok(res, { status: wo.status, next: WORK_ORDER_TRANSITIONS[wo.status] || [] });
});

export const deleteWorkOrder = asyncHandler(async (req, res) => {
  const wo = await loadWorkOrder(req.params.id);
  if (["IN_PROGRESS", "COMPLETED"].includes(wo.status)) {
    throw new ApiError(422, "Cancel the work order instead — started or completed orders cannot be deleted");
  }
  if (wo.complaintId) {
    await Complaint.updateOne({ _id: wo.complaintId }, { $unset: { workOrderId: 1 } });
  }
  await wo.deleteOne();
  await logAudit({ user: req.user, action: "WORK_ORDER_DELETED", module: "WorkOrder", recordId: wo.workOrderId, equipmentId: wo.equipmentId, previousStatus: wo.status, description: `${wo.workOrderId} deleted` });
  return ok(res, { deleted: true, workOrderId: wo.workOrderId });
});

export const assignWorkOrder = asyncHandler(async (req, res) => {
  requireFields(req.body, ["engineerId"]);
  const wo = await loadWorkOrder(req.params.id);
  const engineer = await loadAssignableEngineer(req.body.engineerId);
  wo.engineerId = engineer._id;
  await wo.save();
  if (wo.complaintId) {
    const complaint = await Complaint.findById(wo.complaintId);
    if (complaint) {
      complaint.assignedEngineerId = engineer._id;
      await complaint.save();
    }
  }
  await logAudit({ user: req.user, action: "ENGINEER_ASSIGNED", module: "WorkOrder", recordId: wo.workOrderId, workOrderId: wo._id, equipmentId: wo.equipmentId, description: `${wo.workOrderId} assigned to ${engineer.name}` });
  return ok(res, wo);
});

export const updateWorkOrderStatus = asyncHandler(async (req, res) => {
  assertEnum(req.body.status, WORK_ORDER_STATUSES, "status");
  const wo = await loadWorkOrder(req.params.id);
  assertWorkOrderAccess(wo, req.user);
  const previous = wo.status;
  assertTransition(previous, req.body.status);
  if (req.user.role === "DEPARTMENT_STAFF") throw new ApiError(403, "Department staff cannot change work order status");
  wo.status = req.body.status;
  if (wo.status === "IN_PROGRESS" && !wo.startedAt) wo.startedAt = new Date();
  if (wo.status === "COMPLETED") wo.completedAt = new Date();
  await wo.save();
  await logAudit({ user: req.user, action: "WORK_ORDER_STATUS_CHANGED", module: "WorkOrder", recordId: wo.workOrderId, workOrderId: wo._id, equipmentId: wo.equipmentId, previousStatus: previous, newStatus: wo.status, description: `${wo.workOrderId} ${previous} → ${wo.status}` });
  return ok(res, wo);
});

export const workOrderHistory = asyncHandler(async (req, res) => {
  const wo = await loadWorkOrder(req.params.id);
  assertWorkOrderAccess(wo, req.user);
  return ok(res, await AuditLog.find({ workOrderId: wo._id }).sort({ timestamp: -1 }));
});

/**
 * Start maintenance: guards the engineer + state, creates the Maintenance record,
 * and cascades work order / equipment / complaint statuses.
 */
export const startWorkOrder = asyncHandler(async (req, res) => {
  const wo = await loadWorkOrder(req.params.id);
  if (req.user.role === "BIOMEDICAL_ENGINEER" && String(wo.engineerId) !== String(req.user._id)) {
    throw new ApiError(403, "This work order is assigned to another engineer");
  }
  let maintenance = await Maintenance.findOne({ workOrderId: wo._id, status: { $ne: "COMPLETED" } });
  if (!maintenance) {
    maintenance = await Maintenance.create({
      maintenanceId: await nextCode(Maintenance, "maintenanceId", "MNT-", 4),
      workOrderId: wo._id,
      equipmentId: wo.equipmentId,
      complaintId: wo.complaintId,
      departmentId: wo.departmentId,
      engineerId: wo.engineerId || req.user._id,
      maintenanceType: wo.maintenanceType,
      startTime: new Date(),
      status: "IN_PROGRESS",
      initialCondition: req.body?.initialCondition,
      safetyPrecautions: req.body?.safetyPrecautions,
    });
  } else {
    if (!maintenance.startTime) maintenance.startTime = new Date();
    if (maintenance.status === "STARTED") maintenance.status = "IN_PROGRESS";
    await maintenance.save();
  }

  const prevWoStatus = wo.status;
  wo.status = "IN_PROGRESS";
  if (!wo.startedAt) wo.startedAt = new Date();
  await wo.save();

  if (prevWoStatus !== "IN_PROGRESS") {
    await logAudit({
      user: req.user,
      action: "WORK_ORDER_STATUS_CHANGED",
      module: "WorkOrder",
      recordId: wo.workOrderId,
      workOrderId: wo._id,
      equipmentId: wo.equipmentId,
      previousStatus: prevWoStatus,
      newStatus: "IN_PROGRESS",
      description: `${wo.workOrderId} moved ${prevWoStatus} → IN_PROGRESS`,
    });
  }

  const equipment = await loadEquipment(String(wo.equipmentId));
  await setEquipmentStatus(equipment, "UNDER_MAINTENANCE", req.user, `${wo.workOrderId} started`);

  if (wo.complaintId) {
    const complaint = await Complaint.findById(wo.complaintId);
    if (complaint && complaint.status !== "MAINTENANCE_IN_PROGRESS") {
      await setComplaintStatus(complaint, "MAINTENANCE_IN_PROGRESS", req.user, { force: true });
    }
  }

  await logAudit({
    user: req.user,
    action: "MAINTENANCE_STARTED",
    module: "Maintenance",
    recordId: maintenance.maintenanceId,
    workOrderId: wo._id,
    equipmentId: wo.equipmentId,
    maintenanceId: maintenance._id,
    newStatus: "IN_PROGRESS",
    description: `${maintenance.maintenanceId} started for ${wo.workOrderId}`,
  });

  const full = await populateContext(WorkOrder.findById(wo._id));
  return ok(res, {
    maintenance,
    workOrder: full,
    equipment: full.equipmentId,
    complaint: full.complaintId,
    department: full.departmentId,
    engineer: full.engineerId,
  });
});
