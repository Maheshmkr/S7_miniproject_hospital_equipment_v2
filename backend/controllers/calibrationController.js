import Calibration, {
  CALIBRATION_FREQUENCIES,
  CALIBRATION_RESULTS,
  CALIBRATION_STATUSES,
  CALIBRATION_TYPES,
} from "../models/Calibration.js";
import Equipment from "../models/Equipment.js";
import User from "../models/User.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import ChecklistTemplate from "../models/ChecklistTemplate.js";
import ChecklistQuestion from "../models/ChecklistQuestion.js";
import ChecklistResponse from "../models/ChecklistResponse.js";
import AuditLog from "../models/AuditLog.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode } from "../services/lifecycleService.js";
import { normaliseOutcome, resolveChecklistForEquipment } from "../services/checklistService.js";
import {
  assertCalibrationTransition,
  calibrationScheduleState,
  computeNextCalibrationDate,
  withCalibrationSchedule,
} from "../services/calibrationService.js";

const sameId = (a, b) => Boolean(a && b && String(a) === String(b));

const populateCalibration = (query) =>
  query
    .populate("equipmentId", "equipmentId name category status departmentId location criticality")
    .populate("departmentId", "name code")
    .populate("assignedEngineerId", "name initials email title role")
    .populate("workOrderId", "workOrderId status maintenanceType")
    .populate("maintenanceId", "maintenanceId status")
    .populate("checklistTemplateId", "name equipmentCategory maintenanceType active");

const loadCalibration = async (id) => {
  const record = await findByAnyId(Calibration, id, "calibrationId");
  if (!record) throw new ApiError(404, "Calibration record not found");
  return record;
};

/** Staff read their own department; engineers read assigned or in-department records. */
function assertCalibrationAccess(record, user) {
  if (user.role === "ADMINISTRATOR") return;
  const deptId = record.departmentId?._id || record.departmentId;
  if (user.role === "DEPARTMENT_STAFF") {
    if (!user.departmentId || !sameId(deptId, user.departmentId)) {
      throw new ApiError(403, "This calibration belongs to another department");
    }
    return;
  }
  if (user.role === "BIOMEDICAL_ENGINEER") {
    if (sameId(record.assignedEngineerId?._id || record.assignedEngineerId, user._id)) return;
    if (user.departmentId && sameId(deptId, user.departmentId)) return;
    throw new ApiError(403, "This calibration is not assigned to you");
  }
}

async function loadAssignableEngineer(engineerId) {
  const engineer = await User.findById(engineerId).catch(() => null);
  if (!engineer) throw new ApiError(404, "Engineer not found");
  if (engineer.role !== "BIOMEDICAL_ENGINEER") throw new ApiError(400, "Assignee must be a biomedical engineer");
  if (engineer.status !== "ACTIVE") throw new ApiError(422, "Engineer account is not active");
  return engineer;
}

const UNSCHEDULABLE = ["RETIRED", "OUT_OF_SERVICE"];

async function loadCalibratableEquipment(id) {
  const equipment = await findByAnyId(Equipment, id, "equipmentId");
  if (!equipment) throw new ApiError(404, "Equipment not found");
  if (UNSCHEDULABLE.includes(equipment.status)) {
    throw new ApiError(422, `${equipment.equipmentId} is ${equipment.status} and cannot be calibrated`);
  }
  return equipment;
}

/** Role scoping + UI filters, shared by list and stats. */
function buildFilter(req) {
  const { equipmentId, departmentId, engineerId, status, result, calibrationType, search, from, to, active } =
    req.query;
  const filter = {};
  if (equipmentId) filter.equipmentId = equipmentId;
  if (departmentId) filter.departmentId = departmentId;
  if (engineerId) filter.assignedEngineerId = engineerId;
  if (status && CALIBRATION_STATUSES.includes(status)) filter.status = status;
  if (result) filter.result = result;
  if (calibrationType) filter.calibrationType = calibrationType;
  if (active !== undefined && active !== "") filter.active = active === "true" || active === true;
  const fromDate = assertDate(from, "from date");
  const toDate = assertDate(to, "to date");
  if (fromDate || toDate) {
    filter.scheduledDate = { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) };
  }
  if (search) {
    filter.$or = [
      { calibrationId: new RegExp(search, "i") },
      { title: new RegExp(search, "i") },
      { certificateNumber: new RegExp(search, "i") },
      { calibrationStandard: new RegExp(search, "i") },
    ];
  }
  if (req.user.role === "DEPARTMENT_STAFF" && req.user.departmentId) filter.departmentId = req.user.departmentId;
  if (req.user.role === "BIOMEDICAL_ENGINEER") {
    filter.$and = [
      ...(filter.$and || []),
      {
        $or: [
          { assignedEngineerId: req.user._id },
          ...(req.user.departmentId ? [{ departmentId: req.user.departmentId }] : []),
        ],
      },
    ];
  }
  return filter;
}

export const listCalibrations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = buildFilter(req);
  const [docs, total] = await Promise.all([
    populateCalibration(Calibration.find(filter)).sort({ scheduledDate: 1 }).skip(skip).limit(limit),
    Calibration.countDocuments(filter),
  ]);
  let items = docs.map((d) => withCalibrationSchedule(d));
  // `scheduleState` / `overdue` filter derived values that are never stored.
  if (req.query.scheduleState) items = items.filter((c) => c.scheduleState === req.query.scheduleState);
  if (req.query.overdue === "true") items = items.filter((c) => c.scheduleState === "OVERDUE");
  return ok(res, { items, total, page, limit });
});

export const calibrationStats = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);
  const records = await Calibration.find(filter).lean();
  const now = new Date();
  const counters = {
    total: records.length,
    scheduled: 0,
    inProgress: 0,
    passed: 0,
    failed: 0,
    cancelled: 0,
    dueToday: 0,
    upcoming: 0,
    overdue: 0,
  };
  for (const record of records) {
    if (record.status === "SCHEDULED") counters.scheduled += 1;
    if (record.status === "IN_PROGRESS") counters.inProgress += 1;
    if (record.status === "PASSED") counters.passed += 1;
    if (record.status === "FAILED") counters.failed += 1;
    if (record.status === "CANCELLED") counters.cancelled += 1;
    const state = calibrationScheduleState(record, now);
    if (state === "OVERDUE") counters.overdue += 1;
    if (state === "DUE_TODAY") counters.dueToday += 1;
    if (state === "UPCOMING") counters.upcoming += 1;
  }
  return ok(res, counters);
});

/** Records due within `days` (default 30), soonest first. */
export const calibrationSchedule = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
  const filter = { ...buildFilter(req), status: { $in: ["SCHEDULED", "IN_PROGRESS", "FAILED"] } };
  const docs = await populateCalibration(Calibration.find(filter)).sort({ scheduledDate: 1 }).limit(200);
  const horizon = Date.now() + days * 86_400_000;
  const items = docs
    .map((d) => withCalibrationSchedule(d))
    .filter((c) => c.daysUntilDue === null || c.daysUntilDue * 86_400_000 + Date.now() <= horizon);
  return ok(res, items);
});

export const getCalibration = asyncHandler(async (req, res) => {
  const record = await populateCalibration(Calibration.findById((await loadCalibration(req.params.id))._id));
  assertCalibrationAccess(record, req.user);
  const equipment = await Equipment.findById(record.equipmentId?._id || record.equipmentId);
  const checklist = equipment
    ? await resolveChecklistForEquipment(equipment, "CALIBRATION")
    : { templates: [], questions: [] };
  return ok(res, { calibration: withCalibrationSchedule(record), checklist });
});

export const createCalibration = asyncHandler(async (req, res) => {
  requireFields(req.body, ["equipmentId", "scheduledDate"]);
  assertEnum(req.body.calibrationType, CALIBRATION_TYPES, "calibration type");
  assertEnum(req.body.frequency, CALIBRATION_FREQUENCIES, "frequency");
  assertEnum(req.body.priority, ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "priority");

  const equipment = await loadCalibratableEquipment(req.body.equipmentId);
  if (req.body.departmentId && !sameId(req.body.departmentId, equipment.departmentId)) {
    throw new ApiError(422, "Department does not match the equipment record");
  }
  if (req.body.assignedEngineerId) await loadAssignableEngineer(req.body.assignedEngineerId);
  if (req.body.checklistTemplateId) {
    const template = await ChecklistTemplate.findById(req.body.checklistTemplateId).catch(() => null);
    if (!template) throw new ApiError(404, "Checklist template not found");
  }
  if (req.body.workOrderId) await assertWorkOrderMatches(req.body.workOrderId, equipment);

  const scheduledDate = assertDate(req.body.scheduledDate, "scheduled date");
  const frequency = req.body.frequency || "YEARLY";

  const record = await Calibration.create({
    calibrationId: await nextCode(Calibration, "calibrationId", "CAL-", 4),
    equipmentId: equipment._id,
    departmentId: req.body.departmentId || equipment.departmentId,
    assignedEngineerId: req.body.assignedEngineerId,
    workOrderId: req.body.workOrderId,
    checklistTemplateId: req.body.checklistTemplateId,
    title: req.body.title || `${frequency} calibration — ${equipment.name}`,
    calibrationType: req.body.calibrationType || "INTERNAL",
    calibrationStandard: req.body.calibrationStandard,
    frequency,
    frequencyDays: req.body.frequencyDays,
    scheduledDate,
    nextCalibrationDate: assertDate(req.body.nextCalibrationDate, "next calibration date"),
    tolerance: req.body.tolerance,
    notes: req.body.notes,
    priority: req.body.priority || equipment.criticality || "MEDIUM",
    status: "SCHEDULED",
    createdBy: req.user._id,
  });

  await logAudit({
    user: req.user,
    action: "CALIBRATION_CREATED",
    module: "Calibration",
    recordId: record.calibrationId,
    equipmentId: equipment._id,
    newStatus: record.status,
    description: `${record.calibrationId} scheduled for ${equipment.equipmentId} on ${scheduledDate
      .toISOString()
      .slice(0, 10)}`,
  });
  return created(res, withCalibrationSchedule(await populateCalibration(Calibration.findById(record._id))));
});

async function assertWorkOrderMatches(workOrderId, equipment) {
  const workOrder = await findByAnyId(WorkOrder, workOrderId, "workOrderId");
  if (!workOrder) throw new ApiError(404, "Work order not found");
  if (!sameId(workOrder.equipmentId, equipment._id)) {
    throw new ApiError(422, "Work order belongs to different equipment");
  }
  return workOrder;
}

const EDITABLE = [
  "title",
  "calibrationType",
  "calibrationStandard",
  "frequency",
  "frequencyDays",
  "scheduledDate",
  "nextCalibrationDate",
  "tolerance",
  "findings",
  "correctiveAction",
  "notes",
  "priority",
  "certificateNumber",
  "certificateUrl",
  "measuredValues",
  "checklistTemplateId",
];

export const updateCalibration = asyncHandler(async (req, res) => {
  const record = await loadCalibration(req.params.id);
  assertCalibrationAccess(record, req.user);
  if (["PASSED", "CANCELLED"].includes(record.status)) {
    throw new ApiError(422, `A ${record.status} calibration record cannot be edited`);
  }
  assertEnum(req.body.calibrationType, CALIBRATION_TYPES, "calibration type");
  assertEnum(req.body.frequency, CALIBRATION_FREQUENCIES, "frequency");
  assertEnum(req.body.priority, ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "priority");

  for (const field of EDITABLE) {
    if (req.body[field] === undefined) continue;
    if (field === "scheduledDate" || field === "nextCalibrationDate") {
      record[field] = assertDate(req.body[field], field);
    } else if (field === "measuredValues") {
      record.measuredValues = Array.isArray(req.body.measuredValues) ? req.body.measuredValues : [];
    } else {
      record[field] = req.body[field];
    }
  }
  if (req.body.workOrderId) {
    const equipment = await Equipment.findById(record.equipmentId);
    const workOrder = await assertWorkOrderMatches(req.body.workOrderId, equipment);
    record.workOrderId = workOrder._id;
  }
  await record.save();
  await logAudit({
    user: req.user,
    action: "CALIBRATION_UPDATED",
    module: "Calibration",
    recordId: record.calibrationId,
    equipmentId: record.equipmentId,
    description: `${record.calibrationId} updated`,
  });
  return ok(res, withCalibrationSchedule(await populateCalibration(Calibration.findById(record._id))));
});

export const setCalibrationStatus = asyncHandler(async (req, res) => {
  requireFields(req.body, ["status"]);
  assertEnum(req.body.status, CALIBRATION_STATUSES, "status");
  const record = await loadCalibration(req.params.id);
  assertCalibrationAccess(record, req.user);
  const previous = record.status;
  assertCalibrationTransition(previous, req.body.status);

  record.status = req.body.status;
  if (req.body.status === "IN_PROGRESS" && !record.calibrationDate) record.calibrationDate = new Date();
  if (req.body.status === "CANCELLED") record.active = false;
  if (req.body.notes) record.notes = req.body.notes;
  await record.save();

  await logAudit({
    user: req.user,
    action: "CALIBRATION_STATUS_CHANGED",
    module: "Calibration",
    recordId: record.calibrationId,
    equipmentId: record.equipmentId,
    previousStatus: previous,
    newStatus: record.status,
    description: `${record.calibrationId} moved ${previous} → ${record.status}`,
  });
  return ok(res, withCalibrationSchedule(await populateCalibration(Calibration.findById(record._id))));
});

export const assignCalibration = asyncHandler(async (req, res) => {
  requireFields(req.body, ["engineerId"]);
  const record = await loadCalibration(req.params.id);
  const engineer = await loadAssignableEngineer(req.body.engineerId);
  record.assignedEngineerId = engineer._id;
  await record.save();
  await logAudit({
    user: req.user,
    action: "CALIBRATION_ASSIGNED",
    module: "Calibration",
    recordId: record.calibrationId,
    equipmentId: record.equipmentId,
    description: `${record.calibrationId} assigned to ${engineer.name}`,
  });
  return ok(res, withCalibrationSchedule(await populateCalibration(Calibration.findById(record._id))));
});

export const deleteCalibration = asyncHandler(async (req, res) => {
  const record = await loadCalibration(req.params.id);
  if (["PASSED", "FAILED"].includes(record.status)) {
    throw new ApiError(422, "Completed calibration records cannot be deleted — cancel them instead");
  }
  await record.deleteOne();
  await logAudit({
    user: req.user,
    action: "CALIBRATION_DELETED",
    module: "Calibration",
    recordId: record.calibrationId,
    equipmentId: record.equipmentId,
    description: `${record.calibrationId} deleted`,
  });
  return ok(res, { deleted: record.calibrationId }, "Calibration record deleted");
});

/** Checklist resolved through the existing checklist module. */
export const calibrationChecklist = asyncHandler(async (req, res) => {
  const record = await loadCalibration(req.params.id);
  assertCalibrationAccess(record, req.user);
  const equipment = await Equipment.findById(record.equipmentId);
  if (!equipment) throw new ApiError(404, "Equipment not found");
  return ok(res, await resolveChecklistForEquipment(equipment, "CALIBRATION"));
});

export const calibrationHistory = asyncHandler(async (req, res) => {
  const record = await loadCalibration(req.params.id);
  assertCalibrationAccess(record, req.user);
  const [logs, previous] = await Promise.all([
    AuditLog.find({ module: "Calibration", recordId: record.calibrationId }).sort({ timestamp: -1 }).limit(100).lean(),
    Calibration.find({ equipmentId: record.equipmentId, _id: { $ne: record._id } })
      .sort({ scheduledDate: -1 })
      .limit(50)
      .populate("assignedEngineerId", "name initials")
      .lean(),
  ]);
  return ok(res, { logs, calibrations: previous.map((c) => withCalibrationSchedule(c)) });
});

/**
 * Complete a calibration visit.
 * Reuses the existing lifecycle: one CALIBRATION work order + one maintenance
 * record, checklist answers stored as ChecklistResponse rows, then the equipment
 * calibration dates roll forward.
 */
export const completeCalibration = asyncHandler(async (req, res) => {
  requireFields(req.body, ["result"]);
  assertEnum(req.body.result, CALIBRATION_RESULTS, "result");
  const record = await loadCalibration(req.params.id);
  assertCalibrationAccess(record, req.user);
  if (["PASSED", "CANCELLED"].includes(record.status)) {
    throw new ApiError(422, `Calibration ${record.calibrationId} is already ${record.status}`);
  }

  const equipment = await Equipment.findById(record.equipmentId);
  if (!equipment) throw new ApiError(404, "Equipment not found");

  const completedAt = assertDate(req.body.calibrationDate, "calibration date") || new Date();
  const engineerId = req.body.engineerId || record.assignedEngineerId || req.user._id;
  await loadAssignableEngineer(engineerId).catch((err) => {
    if (req.user.role === "BIOMEDICAL_ENGINEER" && sameId(engineerId, req.user._id)) return req.user;
    throw err;
  });

  // Reuse the linked or an open calibration work order before creating one.
  let workOrder = record.workOrderId ? await WorkOrder.findById(record.workOrderId) : null;
  if (!workOrder) {
    workOrder = await WorkOrder.findOne({
      equipmentId: equipment._id,
      maintenanceType: "CALIBRATION",
      status: { $nin: ["COMPLETED", "CANCELLED"] },
    });
  }
  if (!workOrder) {
    workOrder = await WorkOrder.create({
      workOrderId: await nextCode(WorkOrder, "workOrderId", "WO-", 4),
      title: record.title || `Calibration — ${equipment.name}`,
      equipmentId: equipment._id,
      departmentId: record.departmentId || equipment.departmentId,
      engineerId,
      maintenanceType: "CALIBRATION",
      priority: record.priority,
      status: "IN_PROGRESS",
      scheduledDate: record.scheduledDate,
      description: record.calibrationStandard,
      createdBy: req.user._id,
    });
  }
  workOrder.status = "COMPLETED";
  workOrder.startedAt = workOrder.startedAt || completedAt;
  workOrder.completedAt = completedAt;
  await workOrder.save();

  let maintenance = await Maintenance.findOne({ workOrderId: workOrder._id, status: { $ne: "CANCELLED" } });
  if (!maintenance) {
    maintenance = await Maintenance.create({
      maintenanceId: await nextCode(Maintenance, "maintenanceId", "MNT-", 4),
      workOrderId: workOrder._id,
      equipmentId: equipment._id,
      departmentId: record.departmentId || equipment.departmentId,
      engineerId,
      maintenanceType: "CALIBRATION",
      description: record.title,
      startTime: completedAt,
      status: "STARTED",
    });
  }
  maintenance.status = "COMPLETED";
  maintenance.endTime = completedAt;
  maintenance.correctiveAction = req.body.correctiveAction || maintenance.correctiveAction;
  maintenance.remarks = req.body.notes || maintenance.remarks;
  await maintenance.save();

  // Checklist answers reuse the existing ChecklistResponse store.
  const answers = Array.isArray(req.body.checklistResponses) ? req.body.checklistResponses : [];
  const savedAnswers = [];
  for (const answer of answers) {
    requireFields(answer, ["questionId", "response"]);
    const question = await ChecklistQuestion.findById(answer.questionId).catch(() => null);
    if (!question) throw new ApiError(404, `Checklist question ${answer.questionId} not found`);
    savedAnswers.push(
      await ChecklistResponse.findOneAndUpdate(
        { maintenanceId: maintenance._id, questionId: question._id },
        {
          maintenanceId: maintenance._id,
          workOrderId: workOrder._id,
          equipmentId: equipment._id,
          questionId: question._id,
          templateId: question.templateId,
          engineerId,
          response: String(answer.response),
          outcome: normaliseOutcome(question.responseType, answer.response),
          notes: answer.notes,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ),
    );
  }

  const previousStatus = record.status;
  record.result = req.body.result;
  record.status = req.body.result === "FAIL" ? "FAILED" : "PASSED";
  assertCalibrationTransition(previousStatus === "SCHEDULED" ? "IN_PROGRESS" : previousStatus, record.status);
  record.calibrationDate = completedAt;
  record.nextCalibrationDate =
    assertDate(req.body.nextCalibrationDate, "next calibration date") ||
    computeNextCalibrationDate(completedAt, record.frequency, record.frequencyDays);
  record.workOrderId = workOrder._id;
  record.maintenanceId = maintenance._id;
  if (Array.isArray(req.body.measuredValues)) record.measuredValues = req.body.measuredValues;
  if (req.body.certificateNumber) record.certificateNumber = req.body.certificateNumber;
  if (req.body.certificateUrl) record.certificateUrl = req.body.certificateUrl;
  if (req.body.findings) record.findings = req.body.findings;
  if (req.body.correctiveAction) record.correctiveAction = req.body.correctiveAction;
  if (req.body.notes) record.notes = req.body.notes;
  await record.save();

  equipment.lastCalibrationDate = completedAt;
  equipment.nextCalibrationDate = record.nextCalibrationDate;
  await equipment.save();

  await logAudit({
    user: req.user,
    action: "CALIBRATION_COMPLETED",
    module: "Calibration",
    recordId: record.calibrationId,
    equipmentId: equipment._id,
    workOrderId: workOrder._id,
    maintenanceId: maintenance._id,
    previousStatus,
    newStatus: record.status,
    description: `${record.calibrationId} recorded ${record.result} — next due ${record.nextCalibrationDate
      .toISOString()
      .slice(0, 10)}`,
  });

  return ok(res, {
    calibration: withCalibrationSchedule(await populateCalibration(Calibration.findById(record._id))),
    workOrder,
    maintenance,
    checklistResponses: savedAnswers,
    equipment,
  });
});
