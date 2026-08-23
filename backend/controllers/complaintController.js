import Complaint, { COMPLAINT_STATUSES, COMPLAINT_TRANSITIONS, PRIORITIES } from "../models/Complaint.js";
import Equipment from "../models/Equipment.js";
import User from "../models/User.js";
import AuditLog from "../models/AuditLog.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode, setComplaintStatus, setEquipmentStatus } from "../services/lifecycleService.js";
import { loadEquipment } from "./equipmentController.js";

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
  if (user.role === "ADMINISTRATOR") return;
  if (user.role === "DEPARTMENT_STAFF") {
    if (!user.departmentId || !sameId(complaint.departmentId, user.departmentId)) {
      throw new ApiError(403, "This complaint belongs to another department");
    }
    return;
  }
  if (user.role === "BIOMEDICAL_ENGINEER") {
    if (sameId(complaint.assignedEngineerId, user._id) || sameId(complaint.reportedBy, user._id)) return;
    throw new ApiError(403, "This complaint is not assigned to you");
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
  if (req.user.role === "DEPARTMENT_STAFF" && req.user.departmentId) filter.departmentId = req.user.departmentId;
  if (req.user.role === "BIOMEDICAL_ENGINEER") {
    filter.$and = [
      ...(filter.$and || []),
      { $or: [{ assignedEngineerId: req.user._id }, { reportedBy: req.user._id }] },
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
  requireFields(req.body, ["equipmentId", "title", "description"]);
  assertEnum(req.body.priority, PRIORITIES, "priority");
  const equipment = await loadEquipment(req.body.equipmentId);

  // Staff may only raise tickets for their own department, and never spoof the reporter.
  let departmentId = req.body.departmentId || equipment.departmentId;
  if (req.user.role === "DEPARTMENT_STAFF") {
    if (!req.user.departmentId) throw new ApiError(403, "Your account is not linked to a department");
    if (equipment.departmentId && !sameId(equipment.departmentId, req.user.departmentId)) {
      throw new ApiError(403, "This equipment belongs to another department");
    }
    departmentId = req.user.departmentId;
  }

  const complaint = await Complaint.create({
    complaintId: await nextCode(Complaint, "complaintId", `CMP-${new Date().getFullYear()}-`, 4),
    equipmentId: equipment._id,
    departmentId,
    reportedBy: req.user._id,
    title: req.body.title,
    description: req.body.description,
    priority: req.body.priority || "MEDIUM",
    status: "OPEN",
  });

  if (["CRITICAL", "HIGH"].includes(complaint.priority)) {
    await setEquipmentStatus(equipment, "UNDER_BREAKDOWN", req.user, `Breakdown reported via ${complaint.complaintId}`);
  }

  await complaint.populate([
    { path: "equipmentId", select: "equipmentId name category status" },
    { path: "departmentId", select: "name code" },
    { path: "assignedEngineerId", select: "name initials" },
    { path: "reportedBy", select: "name" },
  ]);

  await logAudit({
    user: req.user,
    action: "COMPLAINT_CREATED",
    module: "Complaint",
    recordId: complaint.complaintId,
    equipmentId: equipment._id,
    newStatus: "OPEN",
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
  await complaint.save();
  await complaint.populate([
    { path: "equipmentId", select: "equipmentId name category status" },
    { path: "departmentId", select: "name code" },
    { path: "assignedEngineerId", select: "name initials" },
    { path: "reportedBy", select: "name" },
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
  return ok(res, complaint);
});

export const assignComplaint = asyncHandler(async (req, res) => {
  requireFields(req.body, ["engineerId"]);
  const complaint = await load(req.params.id);
  const engineer = await User.findById(req.body.engineerId);
  if (!engineer || engineer.role !== "BIOMEDICAL_ENGINEER") throw new ApiError(400, "Assignee must be a biomedical engineer");

  complaint.assignedEngineerId = engineer._id;
  if (complaint.status === "OPEN") complaint.status = "UNDER_REVIEW";
  if (complaint.status === "UNDER_REVIEW") complaint.status = "ASSIGNED";
  await complaint.save();

  await complaint.populate([
    { path: "equipmentId", select: "equipmentId name category status" },
    { path: "departmentId", select: "name code" },
    { path: "assignedEngineerId", select: "name initials" },
    { path: "reportedBy", select: "name" },
  ]);

  await logAudit({
    user: req.user,
    action: "COMPLAINT_ASSIGNED",
    module: "Complaint",
    recordId: complaint.complaintId,
    equipmentId: complaint.equipmentId,
    newStatus: complaint.status,
    description: `${complaint.complaintId} assigned to ${engineer.name}`,
  });
  return ok(res, complaint);
});


export const complaintHistory = asyncHandler(async (req, res) => {
  const complaint = await load(req.params.id);
  assertComplaintAccess(complaint, req.user);
  const events = await AuditLog.find({ recordId: complaint.complaintId }).sort({ timestamp: -1 });
  return ok(res, { complaint, events });
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
  if (complaint.workOrderId) throw new ApiError(409, "Complaint has a linked work order and cannot be deleted");
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
