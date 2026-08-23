import AuditLog from "../models/AuditLog.js";
import AuditInstance, { AuditTemplate } from "../models/AuditInstance.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { loadEquipment } from "./equipmentController.js";

/* ------------------------------ Audit trail ------------------------------ */

export const listAuditLogs = asyncHandler(async (req, res) => {
  const { module, action, userId, equipmentId, dateFrom, dateTo } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (module) filter.module = module;
  if (action) filter.action = action;
  if (userId) filter.userId = userId;
  if (equipmentId) filter.equipmentId = equipmentId;
  if (dateFrom || dateTo) {
    filter.timestamp = {};
    if (dateFrom) filter.timestamp.$gte = assertDate(dateFrom, "dateFrom");
    if (dateTo) filter.timestamp.$lte = assertDate(dateTo, "dateTo");
  }
  const [items, total] = await Promise.all([
    AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit),
    AuditLog.countDocuments(filter),
  ]);
  return ok(res, { items, total, page, limit });
});

export const getAuditLog = asyncHandler(async (req, res) => {
  const log = await AuditLog.findById(req.params.id);
  if (!log) throw new ApiError(404, "Audit entry not found");
  return ok(res, log);
});

export const workOrderAudit = asyncHandler(async (req, res) => {
  const wo = await findByAnyId(WorkOrder, req.params.workOrderId, "workOrderId");
  if (!wo) throw new ApiError(404, "Work order not found");
  return ok(res, await AuditLog.find({ workOrderId: wo._id }).sort({ timestamp: -1 }));
});

export const maintenanceAudit = asyncHandler(async (req, res) => {
  const m = await findByAnyId(Maintenance, req.params.maintenanceId, "maintenanceId");
  if (!m) throw new ApiError(404, "Maintenance record not found");
  return ok(res, await AuditLog.find({ maintenanceId: m._id }).sort({ timestamp: -1 }));
});

/* -------------------------- Governance audits ---------------------------- */

export const listAuditTemplates = asyncHandler(async (_req, res) =>
  ok(res, await AuditTemplate.find().sort({ createdAt: -1 })),
);

export const createAuditTemplate = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name"]);
  const template = await AuditTemplate.create({ ...req.body, createdBy: req.user._id });
  await logAudit({ user: req.user, action: "AUDIT_TEMPLATE_CREATED", module: "Audit", recordId: template._id, description: `Audit template ${template.name}` });
  return created(res, template);
});

export const updateAuditTemplate = asyncHandler(async (req, res) => {
  const template = await AuditTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!template) throw new ApiError(404, "Audit template not found");
  return ok(res, template);
});

export const listAudits = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.user.role === "BIOMEDICAL_ENGINEER") filter.assignedTo = req.user._id;
  return ok(
    res,
    await AuditInstance.find(filter)
      .populate("templateId", "name scope")
      .populate("equipmentId", "equipmentId name")
      .populate("assignedTo", "name initials")
      .sort({ createdAt: -1 }),
  );
});

export const assignAudit = asyncHandler(async (req, res) => {
  requireFields(req.body, ["templateId", "equipmentId", "assignedTo"]);
  const equipment = await loadEquipment(req.body.equipmentId);
  const audit = await AuditInstance.create({
    ...req.body,
    equipmentId: equipment._id,
    assignedBy: req.user._id,
    dueBy: assertDate(req.body.dueBy, "dueBy"),
  });
  await logAudit({ user: req.user, action: "AUDIT_ASSIGNED", module: "Audit", recordId: audit._id, equipmentId: equipment._id, description: "Audit assigned" });
  return created(res, audit);
});

export const respondAudit = asyncHandler(async (req, res) => {
  const audit = await AuditInstance.findById(req.params.id);
  if (!audit) throw new ApiError(404, "Audit not found");
  if (req.user.role === "BIOMEDICAL_ENGINEER" && String(audit.assignedTo) !== String(req.user._id)) {
    throw new ApiError(403, "This audit is assigned to another engineer");
  }
  audit.answers = req.body.answers || audit.answers;
  audit.status = req.body.submit ? "SUBMITTED" : "IN_PROGRESS";
  if (req.body.submit) audit.submittedAt = new Date();
  await audit.save();
  await logAudit({ user: req.user, action: "AUDIT_RESPONDED", module: "Audit", recordId: audit._id, equipmentId: audit.equipmentId, newStatus: audit.status, description: `Audit ${audit.status.toLowerCase()}` });
  return ok(res, audit);
});

export const reviewAudit = asyncHandler(async (req, res) => {
  const audit = await AuditInstance.findById(req.params.id);
  if (!audit) throw new ApiError(404, "Audit not found");
  audit.status = req.body.decision === "REJECTED" ? "REJECTED" : "APPROVED";
  audit.reviewedBy = req.user._id;
  audit.reviewedAt = new Date();
  audit.reviewNote = req.body.reviewNote;
  await audit.save();
  await logAudit({ user: req.user, action: "AUDIT_REVIEWED", module: "Audit", recordId: audit._id, equipmentId: audit.equipmentId, newStatus: audit.status, description: `Audit ${audit.status.toLowerCase()}` });
  return ok(res, audit);
});
