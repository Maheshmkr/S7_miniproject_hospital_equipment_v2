import Maintenance, { MAINTENANCE_TRANSITIONS, MAINTENANCE_TYPES } from "../models/Maintenance.js";
import WorkOrder from "../models/WorkOrder.js";
import User from "../models/User.js";
import Complaint from "../models/Complaint.js";
import Investigation from "../models/Investigation.js";
import ChecklistResponse from "../models/ChecklistResponse.js";
import ChecklistQuestion from "../models/ChecklistQuestion.js";
import Evidence from "../models/Evidence.js";
import ServiceReport from "../models/ServiceReport.js";
import AuditLog from "../models/AuditLog.js";
import Equipment from "../models/Equipment.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode, setComplaintStatus, setEquipmentStatus } from "../services/lifecycleService.js";
import { normaliseOutcome, resolveChecklistForEquipment } from "../services/checklistService.js";

const load = async (id) => {
  const m = await findByAnyId(Maintenance, id, "maintenanceId");
  if (!m) throw new ApiError(404, "Maintenance record not found");
  return m;
};

const assertEngineer = (maintenance, user) => {
  if (user.role === "BIOMEDICAL_ENGINEER" && String(maintenance.engineerId) !== String(user._id)) {
    throw new ApiError(403, "This maintenance belongs to another engineer");
  }
};

/** Read access: engineers see their own work, staff only their department. */
const assertReadAccess = (maintenance, user) => {
  if (user.role === "ADMINISTRATOR") return;
  if (user.role === "BIOMEDICAL_ENGINEER") return assertEngineer(maintenance, user);
  if (
    user.role === "DEPARTMENT_STAFF" &&
    (!user.departmentId || String(maintenance.departmentId) !== String(user.departmentId))
  ) {
    throw new ApiError(403, "This maintenance record is outside your department");
  }
};

const assertTransition = (from, to) => {
  const allowed = MAINTENANCE_TRANSITIONS[from] || [];
  if (from === to) return;
  if (!allowed.includes(to)) throw new ApiError(422, `Maintenance cannot move ${from} → ${to}`);
};

/** Engineer must exist, be active and hold the engineer role. */
const loadEngineerOr422 = async (engineerId, departmentId) => {
  const engineer = await User.findById(engineerId);
  if (!engineer) throw new ApiError(404, "Engineer not found");
  if (engineer.role !== "BIOMEDICAL_ENGINEER") throw new ApiError(422, "Assignee is not a biomedical engineer");
  if (engineer.status !== "ACTIVE") throw new ApiError(422, "Engineer is not active");
  if (engineer.departmentId && departmentId && String(engineer.departmentId) !== String(departmentId)) {
    throw new ApiError(422, "Engineer does not cover this department");
  }
  return engineer;
};

const buildFilter = (req) => {
  const { status, engineerId, equipmentId, workOrderId, departmentId, maintenanceType, from, to, search } =
    req.query;
  const filter = {};
  if (status) filter.status = status;
  if (equipmentId) filter.equipmentId = equipmentId;
  if (workOrderId) filter.workOrderId = workOrderId;
  if (engineerId) filter.engineerId = engineerId;
  if (departmentId) filter.departmentId = departmentId;
  if (maintenanceType) filter.maintenanceType = maintenanceType;
  if (search) filter.maintenanceId = new RegExp(String(search).trim(), "i");
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }
  if (req.user.role === "BIOMEDICAL_ENGINEER") filter.engineerId = req.user._id;
  if (req.user.role === "DEPARTMENT_STAFF") filter.departmentId = req.user.departmentId ?? null;
  return filter;
};

export const listMaintenance = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = buildFilter(req);

  const [items, total] = await Promise.all([
    Maintenance.find(filter)
      .populate("equipmentId", "equipmentId name category status location")
      .populate("workOrderId", "workOrderId title status scheduledDate")
      .populate("departmentId", "code name")
      .populate("engineerId", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Maintenance.countDocuments(filter),
  ]);
  return ok(res, { items, total, page, limit });
});

/** Dashboard counters straight off the collection — same scoping as the list. */
export const maintenanceStats = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);
  const [total, inProgress, completed, awaitingParts, planned] = await Promise.all([
    Maintenance.countDocuments(filter),
    Maintenance.countDocuments({ ...filter, status: { $in: ["IN_PROGRESS", "INVESTIGATION", "TESTING"] } }),
    Maintenance.countDocuments({ ...filter, status: "COMPLETED" }),
    Maintenance.countDocuments({ ...filter, status: "AWAITING_PARTS" }),
    Maintenance.countDocuments({ ...filter, status: "STARTED" }),
  ]);
  return ok(res, { total, inProgress, completed, awaitingParts, planned });
});

/** Valid next statuses for the current record — drives UI controls. */
export const maintenanceTransitions = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertReadAccess(m, req.user);
  return ok(res, { status: m.status, next: MAINTENANCE_TRANSITIONS[m.status] || [] });
});

/**
 * Create a maintenance execution record for an existing work order.
 * Work orders remain the scheduling entity; maintenance is the field execution.
 */
export const createMaintenance = asyncHandler(async (req, res) => {
  requireFields(req.body, ["workOrderId"]);
  const wo = await findByAnyId(WorkOrder, req.body.workOrderId, "workOrderId");
  if (!wo) throw new ApiError(404, "Work order not found");
  if (["COMPLETED", "CANCELLED"].includes(wo.status)) throw new ApiError(422, "Work order is already closed");

  const existing = await Maintenance.findOne({ workOrderId: wo._id, status: { $ne: "CANCELLED" } });
  if (existing) throw new ApiError(409, `Work order already has maintenance ${existing.maintenanceId}`);

  if (req.body.equipmentId && String(req.body.equipmentId) !== String(wo.equipmentId)) {
    throw new ApiError(422, "Equipment does not match the work order");
  }
  const equipment = await Equipment.findById(wo.equipmentId);
  if (!equipment) throw new ApiError(404, "Equipment not found");

  if (req.body.maintenanceType && !MAINTENANCE_TYPES.includes(req.body.maintenanceType)) {
    throw new ApiError(400, `Invalid maintenanceType. Allowed: ${MAINTENANCE_TYPES.join(", ")}`);
  }

  const departmentId = wo.departmentId || equipment.departmentId;
  const engineerId = req.body.engineerId || wo.engineerId || req.user._id;
  await loadEngineerOr422(engineerId, departmentId);
  if (req.user.role === "BIOMEDICAL_ENGINEER" && String(engineerId) !== String(req.user._id)) {
    throw new ApiError(403, "Engineers can only open maintenance assigned to themselves");
  }

  const m = await Maintenance.create({
    maintenanceId: await nextCode(Maintenance, "maintenanceId", "MNT-", 4),
    workOrderId: wo._id,
    equipmentId: wo.equipmentId,
    complaintId: wo.complaintId,
    departmentId,
    engineerId,
    maintenanceType: req.body.maintenanceType || wo.maintenanceType,
    description: req.body.description || wo.description,
    initialCondition: req.body.initialCondition,
    safetyPrecautions: req.body.safetyPrecautions,
    startTime: req.body.startTime ? new Date(req.body.startTime) : new Date(),
    status: "STARTED",
  });

  await logAudit({
    user: req.user,
    action: "MAINTENANCE_CREATED",
    module: "Maintenance",
    recordId: m.maintenanceId,
    maintenanceId: m._id,
    workOrderId: wo._id,
    equipmentId: wo.equipmentId,
    newStatus: "STARTED",
    description: `${m.maintenanceId} opened for ${wo.workOrderId}`,
  });
  return created(res, m);
});

/** Status change with transition validation (completion goes through /complete). */
export const setMaintenanceStatus = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertEngineer(m, req.user);
  requireFields(req.body, ["status"]);
  const next = req.body.status;
  if (next === "COMPLETED") {
    throw new ApiError(422, "Use the completion endpoint so the lifecycle checks run");
  }
  assertTransition(m.status, next);
  const previous = m.status;
  m.status = next;
  await m.save();

  await logAudit({
    user: req.user,
    action: "MAINTENANCE_STATUS_CHANGED",
    module: "Maintenance",
    recordId: m.maintenanceId,
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    previousStatus: previous,
    newStatus: next,
    description: `${m.maintenanceId} moved ${previous} → ${next}`,
  });
  return ok(res, m);
});

/** Administrators reassign the executing engineer. */
export const assignMaintenance = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  requireFields(req.body, ["engineerId"]);
  if (m.status === "COMPLETED") throw new ApiError(422, "Completed maintenance cannot be reassigned");
  const engineer = await loadEngineerOr422(req.body.engineerId, m.departmentId);
  m.engineerId = engineer._id;
  await m.save();

  await logAudit({
    user: req.user,
    action: "MAINTENANCE_ASSIGNED",
    module: "Maintenance",
    recordId: m.maintenanceId,
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    description: `${m.maintenanceId} assigned to ${engineer.name}`,
  });
  return ok(res, m);
});

/** Administrators may remove only records that never produced field evidence. */
export const deleteMaintenance = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  if (m.status === "COMPLETED") throw new ApiError(422, "Completed maintenance cannot be deleted");
  const responses = await ChecklistResponse.countDocuments({ maintenanceId: m._id });
  const evidence = await Evidence.countDocuments({ maintenanceId: m._id });
  if (responses || evidence) throw new ApiError(422, "Maintenance with recorded evidence cannot be deleted");

  await Maintenance.deleteOne({ _id: m._id });
  await logAudit({
    user: req.user,
    action: "MAINTENANCE_DELETED",
    module: "Maintenance",
    recordId: m.maintenanceId,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    description: `${m.maintenanceId} deleted`,
  });
  return ok(res, { deleted: m.maintenanceId });
});

export const getMaintenance = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertReadAccess(m, req.user);
  await m.populate([
    { path: "equipmentId" },
    { path: "workOrderId" },
    { path: "complaintId" },
    { path: "departmentId" },
    { path: "engineerId", select: "name initials title" },
    { path: "investigationId" },
  ]);
  const [responses, evidence, report] = await Promise.all([
    ChecklistResponse.find({ maintenanceId: m._id }).populate("questionId"),
    Evidence.find({ maintenanceId: m._id }).sort({ createdAt: -1 }),
    ServiceReport.findOne({ maintenanceId: m._id }),
  ]);
  return ok(res, { maintenance: m, checklistResponses: responses, evidence, serviceReport: report });
});

const UPDATABLE = [
  "description",
  "maintenanceType",
  "initialCondition",
  "safetyPrecautions",
  "rootCause",
  "contributingFactor",
  "correctiveAction",
  "preventiveAction",
  "partsUsed",
  "finalCondition",
  "remarks",
];

export const updateMaintenance = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertEngineer(m, req.user);
  if (m.status === "COMPLETED") throw new ApiError(422, "Completed maintenance is read-only");
  const { status } = req.body;
  for (const field of UPDATABLE) {
    if (req.body[field] !== undefined) m[field] = req.body[field];
  }
  if (req.body.maintenanceType && !MAINTENANCE_TYPES.includes(req.body.maintenanceType)) {
    throw new ApiError(400, `Invalid maintenanceType. Allowed: ${MAINTENANCE_TYPES.join(", ")}`);
  }
  if (status) {
    if (status === "COMPLETED") throw new ApiError(422, "Use the completion endpoint so the lifecycle checks run");
    assertTransition(m.status, status);
    m.status = status;
  }
  await m.save();
  return ok(res, m);
});

/** Engineer answers the administrator-configured checklist. */
export const submitChecklist = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertEngineer(m, req.user);
  const answers = req.body.answers || req.body.responses;
  if (!Array.isArray(answers) || !answers.length) throw new ApiError(400, "answers[] is required");

  const saved = [];
  for (const answer of answers) {
    requireFields(answer, ["questionId", "response"]);
    const question = await ChecklistQuestion.findById(answer.questionId);
    if (!question) throw new ApiError(404, `Checklist question ${answer.questionId} not found`);
    const outcome = normaliseOutcome(question.responseType, answer.response);

    const doc = await ChecklistResponse.findOneAndUpdate(
      { maintenanceId: m._id, questionId: question._id },
      {
        maintenanceId: m._id,
        workOrderId: m.workOrderId,
        equipmentId: m.equipmentId,
        questionId: question._id,
        templateId: question.templateId,
        engineerId: req.user._id,
        response: String(answer.response),
        outcome,
        notes: answer.notes,
        evidence: answer.evidence || [],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    saved.push(doc);

    if (outcome === "FAIL") {
      await logAudit({
        user: req.user,
        action: "CHECKLIST_QUESTION_FAILED",
        module: "Checklist",
        recordId: m.maintenanceId,
        maintenanceId: m._id,
        workOrderId: m.workOrderId,
        equipmentId: m.equipmentId,
        description: `FAIL · ${question.question}`,
        metadata: { notes: answer.notes, priority: question.priority },
      });
    }
  }

  m.checklistResponses = saved.map((s) => s._id);
  if (m.status === "STARTED") m.status = "IN_PROGRESS";
  await m.save();

  await logAudit({
    user: req.user,
    action: "CHECKLIST_SUBMITTED",
    module: "Checklist",
    recordId: m.maintenanceId,
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    description: `${saved.length} checklist answers recorded`,
  });
  return ok(res, saved);
});

export const getChecklist = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  const equipment = await Equipment.findById(m.equipmentId);
  const resolved = await resolveChecklistForEquipment(equipment, m.maintenanceType);
  const responses = await ChecklistResponse.find({ maintenanceId: m._id });
  return ok(res, { ...resolved, responses });
});

export const upsertInvestigation = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertEngineer(m, req.user);
  const payload = {
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    engineerId: req.user._id,
    ...req.body,
  };
  const investigation = await Investigation.findOneAndUpdate({ maintenanceId: m._id }, payload, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
  });

  m.investigationId = investigation._id;
  m.rootCause = investigation.rootCause ?? m.rootCause;
  m.contributingFactor = investigation.contributingFactor ?? m.contributingFactor;
  m.correctiveAction = investigation.correctiveAction ?? m.correctiveAction;
  m.preventiveAction = investigation.preventiveAction ?? m.preventiveAction;
  if (m.status === "STARTED") m.status = "INVESTIGATION";
  await m.save();

  await logAudit({
    user: req.user,
    action: investigation.rootCause ? "ROOT_CAUSE_ADDED" : "INVESTIGATION_UPDATED",
    module: "Maintenance",
    recordId: m.maintenanceId,
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    description: investigation.rootCause || "Investigation updated",
  });
  return ok(res, investigation);
});

export const getInvestigation = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  return ok(res, await Investigation.findOne({ maintenanceId: m._id }));
});

export const addEvidence = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertEngineer(m, req.user);

  const files = req.files?.length
    ? req.files.map((f) => ({
        fileName: f.originalname,
        fileUrl: `/uploads/${f.filename}`,
        fileType: f.mimetype,
        fileSize: f.size,
      }))
    : [
        {
          fileName: req.body.fileName,
          fileUrl: req.body.fileUrl,
          fileType: req.body.fileType,
          fileSize: req.body.fileSize,
        },
      ];

  const docs = [];
  for (const file of files) {
    if (!file.fileName || !file.fileUrl) throw new ApiError(400, "fileName and fileUrl are required");
    docs.push(
      await Evidence.create({
        ...file,
        maintenanceId: m._id,
        workOrderId: m.workOrderId,
        equipmentId: m.equipmentId,
        complaintId: m.complaintId,
        uploadedBy: req.user._id,
        category: (req.body.category || "DOCUMENT").toUpperCase(),
        note: req.body.note,
      }),
    );
  }

  await logAudit({
    user: req.user,
    action: "EVIDENCE_UPLOADED",
    module: "Maintenance",
    recordId: m.maintenanceId,
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    description: `${docs.length} evidence file(s) attached`,
  });
  return created(res, docs);
});

export const listEvidence = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertReadAccess(m, req.user);
  return ok(res, await Evidence.find({ maintenanceId: m._id }).sort({ createdAt: -1 }));
});

export const createServiceReport = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertEngineer(m, req.user);
  const responses = await ChecklistResponse.find({ maintenanceId: m._id }).populate("questionId");
  const investigation = await Investigation.findOne({ maintenanceId: m._id });
  const evidence = await Evidence.find({ maintenanceId: m._id });

  const payload = {
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    complaintId: m.complaintId,
    engineerId: req.user._id,
    problem: req.body.problem || investigation?.problemObserved,
    diagnosticFindings: req.body.diagnosticFindings || investigation?.diagnosticFindings,
    checklistResults: responses.map((r) => ({
      question: r.questionId?.question,
      response: r.response,
      outcome: r.outcome,
      notes: r.notes,
    })),
    rootCause: req.body.rootCause || m.rootCause,
    correctiveAction: req.body.correctiveAction || m.correctiveAction,
    preventiveAction: req.body.preventiveAction || m.preventiveAction,
    partsUsed: req.body.partsUsed || m.partsUsed,
    evidence: evidence.map((e) => e._id),
    testResult: req.body.testResult,
    finalCondition: req.body.finalCondition,
    engineerRemarks: req.body.engineerRemarks,
    status: req.body.status || "SUBMITTED",
  };

  let report = await ServiceReport.findOne({ maintenanceId: m._id });
  if (report) {
    Object.assign(report, payload);
    await report.save();
  } else {
    report = await ServiceReport.create({
      ...payload,
      serviceReportId: await nextCode(ServiceReport, "serviceReportId", "SR-", 4),
    });
  }

  m.serviceReportId = report._id;
  await m.save();

  await logAudit({
    user: req.user,
    action: "SERVICE_REPORT_CREATED",
    module: "ServiceReport",
    recordId: report.serviceReportId,
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    description: `${report.serviceReportId} submitted`,
  });
  return created(res, report);
});

/** Full completion gate — nothing closes with missing lifecycle evidence. */
export const completeMaintenance = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertEngineer(m, req.user);

  const equipment = await Equipment.findById(m.equipmentId);
  const { questions } = await resolveChecklistForEquipment(equipment, m.maintenanceType);
  const responses = await ChecklistResponse.find({ maintenanceId: m._id });
  const answered = new Map(responses.map((r) => [String(r.questionId), r]));

  const problems = [];
  for (const q of questions) {
    const answer = answered.get(String(q._id));
    if (q.required && !answer) problems.push(`Required checklist question unanswered: "${q.question}"`);
    if (q.priority === "CRITICAL" && answer?.outcome === "FAIL" && !answer.notes) {
      problems.push(`Critical failure needs notes: "${q.question}"`);
    }
  }

  const hasFailure = responses.some((r) => r.outcome === "FAIL");
  const investigation = await Investigation.findOne({ maintenanceId: m._id });
  if (hasFailure && !investigation) problems.push("Investigation is required when a checklist item failed");
  if (hasFailure && !(investigation?.rootCause || m.rootCause)) problems.push("Root cause is required");
  if (!(investigation?.correctiveAction || m.correctiveAction)) problems.push("Corrective action is required");

  const verification = req.body.verification || m.verification;
  if (!verification?.safetyVerified) problems.push("Safety verification is required");

  const report = await ServiceReport.findOne({ maintenanceId: m._id });
  if (!report) problems.push("Service report must be created before completion");

  if (problems.length) throw new ApiError(422, "Maintenance cannot be completed yet", problems);

  m.status = "COMPLETED";
  m.endTime = new Date();
  m.verification = { ...(verification || {}), verifiedBy: req.user._id, verifiedAt: new Date() };
  m.finalCondition = req.body.finalCondition || "OPERATIONAL";
  m.remarks = req.body.remarks || m.remarks;
  await m.save();

  const wo = await WorkOrder.findById(m.workOrderId);
  if (wo) {
    wo.status = "COMPLETED";
    await wo.save();
  }

  await setEquipmentStatus(equipment, "OPERATIONAL", req.user, `${m.maintenanceId} completed`);

  if (m.complaintId) {
    const complaint = await Complaint.findById(m.complaintId);
    if (complaint) await setComplaintStatus(complaint, "RESOLVED", req.user, { force: true });
  }

  if (report) {
    report.verificationStatus = "VERIFIED";
    report.finalCondition = m.finalCondition;
    await report.save();
  }

  await logAudit({
    user: req.user,
    action: "MAINTENANCE_COMPLETED",
    module: "Maintenance",
    recordId: m.maintenanceId,
    maintenanceId: m._id,
    workOrderId: m.workOrderId,
    equipmentId: m.equipmentId,
    newStatus: "COMPLETED",
    description: `${m.maintenanceId} completed · equipment returned to service`,
  });

  return ok(res, { maintenance: m, workOrder: wo, equipment, serviceReport: report });
});

export const maintenanceHistory = asyncHandler(async (req, res) => {
  const m = await load(req.params.id);
  assertReadAccess(m, req.user);
  return ok(res, await AuditLog.find({ maintenanceId: m._id }).sort({ timestamp: -1 }));
});
