import mongoose from "mongoose";
import Complaint, { COMPLAINT_STATUSES, COMPLAINT_TRANSITIONS, PRIORITIES } from "../models/Complaint.js";
import Equipment from "../models/Equipment.js";
import User from "../models/User.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import AuditLog from "../models/AuditLog.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode, setComplaintStatus, setEquipmentStatus } from "../services/lifecycleService.js";
import { loadEquipment, resolveDepartmentId } from "./equipmentController.js";
import { recalculateEquipmentEhs } from "../services/ehsService.js";

const load = async (id) => {
  const c = await findByAnyId(Complaint, id, "complaintId");
  if (!c) throw new ApiError(404, "Complaint not found");
  return c;
};

const sameId = (a, b) => Boolean(a && b && String(a) === String(b));

/**
 * Department staff only reach their own department's tickets; engineers reach the
 * ones assigned to them (or that they raised). Administrators reach everything.
 */
function assertComplaintAccess(complaint, user) {
  if (!user) throw new ApiError(401, "Authentication required");
  if (user.role === "ADMINISTRATOR") return;
  if (user.role === "DEPARTMENT_STAFF") {
    const deptId = complaint.departmentId?._id || complaint.departmentId;
    if (!sameId(deptId, user.departmentId)) {
      throw new ApiError(403, "Access forbidden: cannot access complaints outside your department");
    }
    return;
  }
}

/** Fields a caller may change through PUT — never ids, reporter or status. */
const EDITABLE = ["title", "description", "priority", "resolution"];

export const listComplaints = asyncHandler(async (req, res) => {
  const { status, priority, departmentId, equipmentId, engineerId, reportedBy, search, from, to } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (departmentId) filter.departmentId = departmentId;
  if (equipmentId) filter.equipmentId = equipmentId;
  if (engineerId) filter.assignedEngineerId = engineerId;
  if (reportedBy) filter.reportedBy = reportedBy;
  if (req.user?.role === "DEPARTMENT_STAFF") {
    filter.departmentId = req.user.departmentId;
  }
  const fromDate = assertDate(from, "from date");
  const toDate = assertDate(to, "to date");
  if (fromDate || toDate) {
    filter.createdAt = { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) };
  }
  if (search) {
    filter.$or = [
      { title: new RegExp(search, "i") },
      { complaintId: new RegExp(search, "i") },
      { description: new RegExp(search, "i") },
    ];
  }

  const [items, total] = await Promise.all([
    Complaint.find(filter)
      .populate("equipmentId", "equipmentId name category")
      .populate("departmentId", "name code")
      .populate("assignedEngineerId", "name initials")
      .populate("reportedBy", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Complaint.countDocuments(filter),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

export const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await load(req.params.id);
  assertComplaintAccess(complaint, req.user);
  await complaint.populate([
    { path: "equipmentId", select: "equipmentId name category status" },
    { path: "departmentId", select: "name code" },
    { path: "assignedEngineerId", select: "name initials" },
    { path: "reportedBy", select: "name" },
    { path: "workOrderId", select: "workOrderId title status" },
  ]);
  return ok(res, complaint);
});

export const createComplaint = asyncHandler(async (req, res) => {
  requireFields(req.body, ["equipmentId", "title"]);
  if (!req.body.description || !String(req.body.description).trim()) {
    req.body.description = req.body.title || "Equipment issue reported by hospital staff";
  }

  const rawPriority = String(req.body.priority || "MEDIUM").toUpperCase();
  req.body.priority = PRIORITIES.includes(rawPriority) ? rawPriority : "MEDIUM";

  const equipment = await loadEquipment(req.body.equipmentId);

  let departmentId = equipment.departmentId?._id || equipment.departmentId;
  if (!departmentId && req.body.departmentId) {
    departmentId = await resolveDepartmentId(req.body.departmentId);
  }
  if (!departmentId && req.user.departmentId) {
    departmentId = req.user.departmentId;
  }

  const rawEng = req.body.engineerId || req.body.assignedEngineerId;
  let engineer = null;
  if (rawEng && rawEng !== "Unassigned" && rawEng !== "none" && rawEng !== "unassigned") {
    if (mongoose.Types.ObjectId.isValid(rawEng)) {
      engineer = await User.findById(rawEng);
    }
    if (!engineer) {
      engineer = await User.findOne({ name: new RegExp(`^${rawEng}$`, "i"), role: "BIOMEDICAL_ENGINEER" });
    }
    if (!engineer || engineer.role !== "BIOMEDICAL_ENGINEER") {
      throw new ApiError(400, "Assignee must be a biomedical engineer");
    }
  } else {
    // Automatically route to the active Biomedical Engineer
    engineer = await User.findOne({ role: "BIOMEDICAL_ENGINEER", status: "ACTIVE" });
  }

  const complaint = await Complaint.create({
    complaintId: await nextCode(Complaint, "complaintId", `CMP-${new Date().getFullYear()}-`, 4),
    equipmentId: equipment._id,
    departmentId,
    reportedBy: req.user._id,
    assignedEngineerId: engineer ? engineer._id : undefined,
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority,
    status: req.body.status || (engineer ? "ASSIGNED" : "OPEN"),
  });

  if (engineer) {
    const wo = await WorkOrder.create({
      workOrderId: await nextCode(WorkOrder, "workOrderId", "WO-", 4),
      title: `Investigate: ${complaint.title}`,
      equipmentId: complaint.equipmentId,
      complaintId: complaint._id,
      departmentId: complaint.departmentId,
      engineerId: engineer._id,
      maintenanceType: "CORRECTIVE",
      priority: complaint.priority || "MEDIUM",
      status: "ASSIGNED",
      scheduledDate: new Date(),
      description: complaint.description || complaint.title,
      createdBy: req.user._id,
    });
    complaint.workOrderId = wo._id;
    await complaint.save();
  }

  if (["CRITICAL", "HIGH"].includes(complaint.priority)) {
    await setEquipmentStatus(equipment, "UNDER_BREAKDOWN", req.user, `Breakdown reported via ${complaint.complaintId}`);
  }

  await recalculateEquipmentEhs(equipment._id);

  await complaint.populate([
    { path: "equipmentId", select: "equipmentId name category status" },
    { path: "departmentId", select: "name code" },
    { path: "assignedEngineerId", select: "name initials" },
    { path: "reportedBy", select: "name" },
    { path: "workOrderId", select: "workOrderId title status" },
  ]);

  await logAudit({
    user: req.user,
    action: "COMPLAINT_CREATED",
    module: "Complaint",
    recordId: complaint.complaintId,
    equipmentId: equipment._id,
    newStatus: complaint.status,
    description: `${complaint.complaintId} · ${complaint.title}`,
  });
  return created(res, complaint);
});

export const updateComplaint = asyncHandler(async (req, res) => {
  const complaint = await load(req.params.id);
  assertComplaintAccess(complaint, req.user);
  assertEnum(req.body.priority, PRIORITIES, "priority");
  if (["RESOLVED", "CLOSED"].includes(complaint.status) && req.user.role !== "ADMINISTRATOR") {
    throw new ApiError(409, "A resolved complaint can no longer be edited");
  }
  for (const field of EDITABLE) {
    if (req.body[field] !== undefined) complaint[field] = req.body[field];
  }
  const engineerId = req.body.engineerId || req.body.assignedEngineerId;
  if (engineerId) {
    const engineer = await User.findById(engineerId);
    if (engineer && engineer.role === "BIOMEDICAL_ENGINEER") {
      complaint.assignedEngineerId = engineer._id;
      if (complaint.status === "OPEN" || complaint.status === "UNDER_REVIEW") {
        complaint.status = "ASSIGNED";
      }
      let wo = null;
      if (complaint.workOrderId) {
        wo = await WorkOrder.findById(complaint.workOrderId);
      }
      if (!wo) {
        wo = await WorkOrder.findOne({ complaintId: complaint._id, status: { $ne: "CANCELLED" } });
      }
      if (wo) {
        wo.engineerId = engineer._id;
        await wo.save();
        complaint.workOrderId = wo._id;
      } else {
        wo = await WorkOrder.create({
          workOrderId: await nextCode(WorkOrder, "workOrderId", "WO-", 4),
          title: `Investigate: ${complaint.title}`,
          equipmentId: complaint.equipmentId,
          complaintId: complaint._id,
          departmentId: complaint.departmentId,
          engineerId: engineer._id,
          maintenanceType: "CORRECTIVE",
          priority: complaint.priority || "MEDIUM",
          status: "ASSIGNED",
          scheduledDate: new Date(),
          description: complaint.description || complaint.title,
          createdBy: req.user._id,
        });
        complaint.workOrderId = wo._id;
      }
    }
  }
  await complaint.save();
  await complaint.populate([
    { path: "equipmentId", select: "equipmentId name category status" },
    { path: "departmentId", select: "name code" },
    { path: "assignedEngineerId", select: "name initials" },
    { path: "reportedBy", select: "name" },
    { path: "workOrderId", select: "workOrderId title status" },
  ]);
  await logAudit({ user: req.user, action: "COMPLAINT_UPDATED", module: "Complaint", recordId: complaint.complaintId, equipmentId: complaint.equipmentId, description: `${complaint.complaintId} updated` });
  return ok(res, complaint);
});

export const updateComplaintStatus = asyncHandler(async (req, res) => {
  assertEnum(req.body.status, COMPLAINT_STATUSES, "status");
  const complaint = await load(req.params.id);
  assertComplaintAccess(complaint, req.user);
  await setComplaintStatus(complaint, req.body.status, req.user);
  await complaint.populate([
    { path: "equipmentId", select: "equipmentId name category status" },
    { path: "departmentId", select: "name code" },
    { path: "assignedEngineerId", select: "name initials" },
    { path: "reportedBy", select: "name" },
  ]);
  await recalculateEquipmentEhs(complaint.equipmentId);
  return ok(res, complaint);
});

export const assignComplaint = asyncHandler(async (req, res) => {
  const engineerId = req.body.engineerId || req.body.assignedEngineerId;
  if (!engineerId) throw new ApiError(400, "engineerId is required");
  const complaint = await load(req.params.id);
  const engineer = await User.findById(engineerId);
  if (!engineer || engineer.role !== "BIOMEDICAL_ENGINEER") throw new ApiError(400, "Assignee must be a biomedical engineer");

  complaint.assignedEngineerId = engineer._id;
  if (complaint.status === "OPEN" || complaint.status === "UNDER_REVIEW") {
    complaint.status = "ASSIGNED";
  }

  let wo = null;
  if (complaint.workOrderId) {
    wo = await WorkOrder.findById(complaint.workOrderId);
  }
  if (!wo) {
    wo = await WorkOrder.findOne({ complaintId: complaint._id, status: { $ne: "CANCELLED" } });
  }

  if (wo) {
    wo.engineerId = engineer._id;
    if (wo.status === "ASSIGNED" && !wo.engineerId) wo.engineerId = engineer._id;
    await wo.save();
    complaint.workOrderId = wo._id;
  } else {
    wo = await WorkOrder.create({
      workOrderId: await nextCode(WorkOrder, "workOrderId", "WO-", 4),
      title: `Investigate: ${complaint.title}`,
      equipmentId: complaint.equipmentId,
      complaintId: complaint._id,
      departmentId: complaint.departmentId,
      engineerId: engineer._id,
      maintenanceType: "CORRECTIVE",
      priority: complaint.priority || "MEDIUM",
      status: "ASSIGNED",
      scheduledDate: new Date(),
      description: complaint.description || complaint.title,
      createdBy: req.user._id,
    });
    complaint.workOrderId = wo._id;
  }

  await complaint.save();

  await complaint.populate([
    { path: "equipmentId", select: "equipmentId name category status" },
    { path: "departmentId", select: "name code" },
    { path: "assignedEngineerId", select: "name initials" },
    { path: "reportedBy", select: "name" },
    { path: "workOrderId", select: "workOrderId title status" },
  ]);

  await logAudit({
    user: req.user,
    action: "COMPLAINT_ASSIGNED",
    module: "Complaint",
    recordId: complaint.complaintId,
    equipmentId: complaint.equipmentId,
    workOrderId: wo._id,
    newStatus: complaint.status,
    description: `${complaint.complaintId} assigned to ${engineer.name}`,
  });
  return ok(res, complaint);
});

export const complaintHistory = asyncHandler(async (req, res) => {
  const complaint = await load(req.params.id);
  assertComplaintAccess(complaint, req.user);
  const query = {
    $or: [
      { recordId: complaint.complaintId },
      { complaintId: complaint._id },
    ],
  };
  if (complaint.workOrderId) {
    query.$or.push({ workOrderId: complaint.workOrderId });
  }
  const events = await AuditLog.find(query).sort({ timestamp: -1 });
  return ok(res, { complaint, events });
});

export const complaintTimeline = asyncHandler(async (req, res) => {
  const complaint = await load(req.params.id);
  assertComplaintAccess(complaint, req.user);
  const query = {
    $or: [
      { recordId: complaint.complaintId },
      { complaintId: complaint._id },
    ],
  };
  if (complaint.workOrderId) {
    query.$or.push({ workOrderId: complaint.workOrderId });
  }
  const events = await AuditLog.find(query)
    .populate("userId", "name role initials")
    .sort({ timestamp: 1 });

  const timeline = events.map((ev) => ({
    _id: ev._id,
    title: ev.description || ev.action,
    status: ev.newStatus || ev.action,
    action: ev.action,
    actor: ev.userId || { name: ev.userName || "System", role: ev.role || "SYSTEM" },
    timestamp: ev.timestamp || new Date(),
    metadata: ev.metadata,
  }));

  return ok(res, timeline);
});

export const addComplaintMessage = asyncHandler(async (req, res) => {
  requireFields(req.body, ["body"]);
  const complaint = await load(req.params.id);
  assertComplaintAccess(complaint, req.user);
  complaint.messages.push({ author: req.user._id, authorName: req.user.name, role: req.user.role, body: req.body.body });
  await complaint.save();
  return ok(res, complaint);
});

export const deleteComplaint = asyncHandler(async (req, res) => {
  const complaint = await load(req.params.id);
  if (complaint.workOrderId) {
    const wo = await WorkOrder.findById(complaint.workOrderId);
    const hasMaintenance = await Maintenance.exists({ workOrderId: complaint.workOrderId });
    if (hasMaintenance || (wo && wo.status !== "ASSIGNED")) {
      throw new ApiError(409, "Complaint has active maintenance and cannot be deleted");
    }
    if (wo) {
      await WorkOrder.deleteOne({ _id: wo._id });
    }
  }
  await complaint.deleteOne();
  await logAudit({
    user: req.user,
    action: "COMPLAINT_DELETED",
    module: "Complaint",
    recordId: complaint.complaintId,
    equipmentId: complaint.equipmentId,
    description: `${complaint.complaintId} deleted`,
  });
  return ok(res, null, "Complaint deleted");
});

/** Statuses this complaint may legally move to next — drives the UI status control. */
export const complaintTransitions = asyncHandler(async (req, res) => {
  const complaint = await load(req.params.id);
  assertComplaintAccess(complaint, req.user);
  return ok(res, { status: complaint.status, next: COMPLAINT_TRANSITIONS[complaint.status] || [] });
});

export const equipmentOptions = asyncHandler(async (_req, res) =>
  ok(res, await Equipment.find().select("equipmentId name category departmentId").sort({ equipmentId: 1 })),
);
