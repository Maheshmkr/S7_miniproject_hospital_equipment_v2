import PreventiveMaintenance, { PM_FREQUENCIES } from "../models/PreventiveMaintenance.js";
import Equipment from "../models/Equipment.js";
import User from "../models/User.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import ChecklistTemplate from "../models/ChecklistTemplate.js";
import ChecklistQuestion from "../models/ChecklistQuestion.js";
import ChecklistResponse from "../models/ChecklistResponse.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode } from "../services/lifecycleService.js";
import { normaliseOutcome, resolveChecklistForEquipment } from "../services/checklistService.js";
import { computeNextDueDate, scheduleState, startOfDay, withSchedule } from "../services/preventiveService.js";

const sameId = (a, b) => Boolean(a && b && String(a) === String(b));

const populatePlan = (query) =>
  query
    .populate("equipmentId", "equipmentId name category status departmentId location criticality")
    .populate("departmentId", "name code")
    .populate("assignedEngineerId", "name initials email title role")
    .populate("checklistTemplateId", "name equipmentCategory maintenanceType active");

export const loadPlan = async (id) => {
  const plan = await findByAnyId(PreventiveMaintenance, id, "preventiveMaintenanceId");
  if (!plan) throw new ApiError(404, "Preventive maintenance plan not found");
  return plan;
};

/** Staff read their own department; engineers read assigned or in-department plans. */
function assertPlanAccess(plan, user) {
  if (user.role === "ADMINISTRATOR") return;
  if (user.role === "DEPARTMENT_STAFF") {
    if (!user.departmentId || !sameId(plan.departmentId?._id || plan.departmentId, user.departmentId)) {
      throw new ApiError(403, "This plan belongs to another department");
    }
    return;
  }
  if (user.role === "BIOMEDICAL_ENGINEER") {
    if (sameId(plan.assignedEngineerId?._id || plan.assignedEngineerId, user._id)) return;
    if (user.departmentId && sameId(plan.departmentId?._id || plan.departmentId, user.departmentId)) return;
    throw new ApiError(403, "This plan is not assigned to you");
  }
}

async function loadAssignableEngineer(engineerId) {
  const engineer = await User.findById(engineerId).catch(() => null);
  if (!engineer) throw new ApiError(404, "Engineer not found");
  if (engineer.role !== "BIOMEDICAL_ENGINEER") throw new ApiError(400, "Assignee must be a biomedical engineer");
  if (engineer.status !== "ACTIVE") throw new ApiError(422, "Engineer account is not active");
  return engineer;
}

const RETIRED_STATUSES = ["RETIRED", "OUT_OF_SERVICE"];

async function loadPlannableEquipment(id) {
  const equipment = await findByAnyId(Equipment, id, "equipmentId");
  if (!equipment) throw new ApiError(404, "Equipment not found");
  if (RETIRED_STATUSES.includes(equipment.status)) {
    throw new ApiError(422, `${equipment.equipmentId} is ${equipment.status} and cannot be scheduled`);
  }
  return equipment;
}

/** Role scoping + UI filters, shared by list and stats. */
function buildFilter(req) {
  const { equipmentId, departmentId, engineerId, frequency, active, search, from, to } = req.query;
  const filter = {};
  if (equipmentId) filter.equipmentId = equipmentId;
  if (departmentId) filter.departmentId = departmentId;
  if (engineerId) filter.assignedEngineerId = engineerId;
  if (frequency) filter.frequency = frequency;
  if (active !== undefined && active !== "") filter.active = active === "true" || active === true;
  const fromDate = assertDate(from, "from date");
  const toDate = assertDate(to, "to date");
  if (fromDate || toDate) {
    filter.nextDueDate = { ...(fromDate ? { $gte: fromDate } : {}), ...(toDate ? { $lte: toDate } : {}) };
  }
  if (search) {
    filter.$or = [
      { preventiveMaintenanceId: new RegExp(search, "i") },
      { title: new RegExp(search, "i") },
      { instructions: new RegExp(search, "i") },
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

export const listPlans = asyncHandler(async (req, res) => {
  const { page, limit, skip } = paginate(req.query);
  const filter = buildFilter(req);
  const [docs, total] = await Promise.all([
    populatePlan(PreventiveMaintenance.find(filter)).sort({ nextDueDate: 1 }).skip(skip).limit(limit),
    PreventiveMaintenance.countDocuments(filter),
  ]);
  let items = docs.map((d) => withSchedule(d));
  // `status` filters the derived schedule state, which is never stored.
  if (req.query.status) items = items.filter((p) => p.scheduleState === req.query.status);
  if (req.query.overdue === "true") items = items.filter((p) => p.scheduleState === "OVERDUE");
  return ok(res, { items, total, page, limit });
});

export const planStats = asyncHandler(async (req, res) => {
  const filter = buildFilter(req);
  const plans = await PreventiveMaintenance.find(filter).lean();
  const now = new Date();
  const counters = { total: plans.length, active: 0, inactive: 0, dueToday: 0, upcoming: 0, overdue: 0, completed: 0 };
  for (const plan of plans) {
    if (plan.active) counters.active += 1;
    else counters.inactive += 1;
    if (plan.lastCompletedDate) counters.completed += 1;
    const state = scheduleState(plan, now);
    if (state === "OVERDUE") counters.overdue += 1;
    if (state === "DUE_TODAY") counters.dueToday += 1;
    if (state === "UPCOMING") counters.upcoming += 1;
  }
  return ok(res, counters);
});

/** Schedule feed for calendar / due widgets — defaults to the next 30 days. */
export const planSchedule = asyncHandler(async (req, res) => {
  const filter = { ...buildFilter(req), active: true };
  const days = Math.min(365, Math.max(1, Number.parseInt(req.query.days ?? "30", 10) || 30));
  const horizon = new Date(startOfDay(new Date()));
  horizon.setDate(horizon.getDate() + days);
  filter.nextDueDate = { ...(filter.nextDueDate || {}), $lte: horizon };
  const docs = await populatePlan(PreventiveMaintenance.find(filter)).sort({ nextDueDate: 1 });
  return ok(res, docs.map((d) => withSchedule(d)));
});

export const getPlan = asyncHandler(async (req, res) => {
  const plan = await populatePlan(
    PreventiveMaintenance.findById((await loadPlan(req.params.id))._id),
  );
  assertPlanAccess(plan, req.user);
  const equipment = plan.equipmentId?._id ? await Equipment.findById(plan.equipmentId._id) : null;
  const checklist = equipment ? await resolveChecklistForEquipment(equipment, "PREVENTIVE") : { templates: [], questions: [] };
  return ok(res, { plan: withSchedule(plan), checklist });
});

export const createPlan = asyncHandler(async (req, res) => {
  requireFields(req.body, ["equipmentId", "frequency", "startDate"]);
  assertEnum(req.body.frequency, PM_FREQUENCIES, "frequency");
  assertEnum(req.body.priority, ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "priority");

  const equipment = await loadPlannableEquipment(req.body.equipmentId);
  const departmentId = req.body.departmentId || equipment.departmentId;
  if (req.body.departmentId && !sameId(req.body.departmentId, equipment.departmentId)) {
    throw new ApiError(422, "Department does not match the equipment record");
  }
  if (req.body.assignedEngineerId) await loadAssignableEngineer(req.body.assignedEngineerId);
  if (req.body.checklistTemplateId) {
    const template = await ChecklistTemplate.findById(req.body.checklistTemplateId).catch(() => null);
    if (!template) throw new ApiError(404, "Checklist template not found");
  }

  const startDate = assertDate(req.body.startDate, "start date");
  const frequencyValue = Math.max(1, Number(req.body.frequencyValue) || 1);
  const nextDueDate = assertDate(req.body.nextDueDate, "next due date") || startDate;

  const plan = await PreventiveMaintenance.create({
    preventiveMaintenanceId: await nextCode(PreventiveMaintenance, "preventiveMaintenanceId", "PM-", 4),
    title: req.body.title || `${req.body.frequency} preventive maintenance — ${equipment.name}`,
    equipmentId: equipment._id,
    departmentId,
    assignedEngineerId: req.body.assignedEngineerId,
    checklistTemplateId: req.body.checklistTemplateId,
    frequency: req.body.frequency,
    frequencyValue,
    startDate,
    nextDueDate,
    priority: req.body.priority || equipment.criticality || "MEDIUM",
    instructions: req.body.instructions,
    notes: req.body.notes,
    active: req.body.active !== undefined ? Boolean(req.body.active) : true,
    createdBy: req.user._id,
  });

  await logAudit({
    user: req.user,
    action: "PREVENTIVE_PLAN_CREATED",
    module: "PreventiveMaintenance",
    recordId: plan.preventiveMaintenanceId,
    equipmentId: equipment._id,
    description: `${plan.preventiveMaintenanceId} scheduled ${plan.frequency} for ${equipment.equipmentId}`,
  });
  return created(res, withSchedule(await populatePlan(PreventiveMaintenance.findById(plan._id))));
});

const EDITABLE = [
  "title",
  "frequency",
  "frequencyValue",
  "startDate",
  "nextDueDate",
  "priority",
  "instructions",
  "notes",
  "checklistTemplateId",
];

export const updatePlan = asyncHandler(async (req, res) => {
  const plan = await loadPlan(req.params.id);
  assertEnum(req.body.frequency, PM_FREQUENCIES, "frequency");
  assertEnum(req.body.priority, ["LOW", "MEDIUM", "HIGH", "CRITICAL"], "priority");

  for (const field of EDITABLE) {
    if (req.body[field] === undefined) continue;
    if (field === "startDate" || field === "nextDueDate") plan[field] = assertDate(req.body[field], field);
    else if (field === "frequencyValue") plan[field] = Math.max(1, Number(req.body[field]) || 1);
    else plan[field] = req.body[field];
  }
  if (req.body.frequency && !req.body.nextDueDate) {
    const anchor = plan.lastCompletedDate || plan.startDate;
    plan.nextDueDate = computeNextDueDate(anchor, plan.frequency, plan.frequencyValue);
  }
  await plan.save();
  await logAudit({
    user: req.user,
    action: "PREVENTIVE_PLAN_UPDATED",
    module: "PreventiveMaintenance",
    recordId: plan.preventiveMaintenanceId,
    equipmentId: plan.equipmentId,
    description: `${plan.preventiveMaintenanceId} updated`,
  });
  return ok(res, withSchedule(await populatePlan(PreventiveMaintenance.findById(plan._id))));
});

/** Activate / deactivate a plan. */
export const setPlanStatus = asyncHandler(async (req, res) => {
  const plan = await loadPlan(req.params.id);
  if (req.body.active === undefined) throw new ApiError(400, "Missing required field(s): active");
  const active = req.body.active === true || req.body.active === "true";
  const previous = plan.active ? "ACTIVE" : "INACTIVE";
  plan.active = active;
  await plan.save();
  await logAudit({
    user: req.user,
    action: active ? "PREVENTIVE_PLAN_ACTIVATED" : "PREVENTIVE_PLAN_DEACTIVATED",
    module: "PreventiveMaintenance",
    recordId: plan.preventiveMaintenanceId,
    equipmentId: plan.equipmentId,
    previousStatus: previous,
    newStatus: active ? "ACTIVE" : "INACTIVE",
    description: `${plan.preventiveMaintenanceId} ${active ? "activated" : "deactivated"}`,
  });
  return ok(res, withSchedule(await populatePlan(PreventiveMaintenance.findById(plan._id))));
});

export const assignPlan = asyncHandler(async (req, res) => {
  requireFields(req.body, ["engineerId"]);
  const plan = await loadPlan(req.params.id);
  const engineer = await loadAssignableEngineer(req.body.engineerId);
  plan.assignedEngineerId = engineer._id;
  await plan.save();
  await logAudit({
    user: req.user,
    action: "PREVENTIVE_PLAN_ASSIGNED",
    module: "PreventiveMaintenance",
    recordId: plan.preventiveMaintenanceId,
    equipmentId: plan.equipmentId,
    description: `${plan.preventiveMaintenanceId} assigned to ${engineer.name}`,
  });
  return ok(res, withSchedule(await populatePlan(PreventiveMaintenance.findById(plan._id))));
});

export const deletePlan = asyncHandler(async (req, res) => {
  const plan = await loadPlan(req.params.id);
  if (plan.lastCompletedDate) {
    throw new ApiError(422, "Plans with completion history cannot be deleted — deactivate them instead");
  }
  await plan.deleteOne();
  await logAudit({
    user: req.user,
    action: "PREVENTIVE_PLAN_DELETED",
    module: "PreventiveMaintenance",
    recordId: plan.preventiveMaintenanceId,
    equipmentId: plan.equipmentId,
    description: `${plan.preventiveMaintenanceId} deleted`,
  });
  return ok(res, { deleted: plan.preventiveMaintenanceId }, "Preventive maintenance plan deleted");
});

/** Checklist for the plan, resolved through the existing checklist module. */
export const planChecklist = asyncHandler(async (req, res) => {
  const plan = await populatePlan(PreventiveMaintenance.findById((await loadPlan(req.params.id))._id));
  assertPlanAccess(plan, req.user);
  const equipment = await Equipment.findById(plan.equipmentId?._id || plan.equipmentId);
  const resolved = await resolveChecklistForEquipment(equipment, "PREVENTIVE");
  return ok(res, resolved);
});

export const planHistory = asyncHandler(async (req, res) => {
  const plan = await loadPlan(req.params.id);
  assertPlanAccess(plan, req.user);
  const [logs, maintenance] = await Promise.all([
    (await import("../models/AuditLog.js")).default
      .find({ module: "PreventiveMaintenance", recordId: plan.preventiveMaintenanceId })
      .sort({ timestamp: -1 })
      .limit(100)
      .lean(),
    Maintenance.find({ equipmentId: plan.equipmentId, maintenanceType: "PREVENTIVE", status: "COMPLETED" })
      .sort({ endTime: -1 })
      .limit(50)
      .populate("engineerId", "name initials")
      .lean(),
  ]);
  return ok(res, { logs, maintenance });
});

/**
 * Complete a due preventive visit.
 * Reuses the existing lifecycle: one PREVENTIVE work order + one maintenance
 * record (never duplicated), checklist answers stored as ChecklistResponse rows,
 * then the plan and the equipment PPM dates roll forward by frequency.
 */
export const completePlan = asyncHandler(async (req, res) => {
  const plan = await loadPlan(req.params.id);
  assertPlanAccess(plan, req.user);
  if (!plan.active) throw new ApiError(422, "This plan is inactive");

  const equipment = await Equipment.findById(plan.equipmentId);
  if (!equipment) throw new ApiError(404, "Equipment not found");

  const completedAt = assertDate(req.body.completionDate, "completion date") || new Date();
  const engineerId = req.body.engineerId || plan.assignedEngineerId || req.user._id;
  await loadAssignableEngineer(engineerId).catch((err) => {
    if (req.user.role === "BIOMEDICAL_ENGINEER" && sameId(engineerId, req.user._id)) return req.user;
    throw err;
  });

  // Reuse an open preventive work order for this plan before creating one.
  let workOrder = await WorkOrder.findOne({
    equipmentId: equipment._id,
    maintenanceType: "PREVENTIVE",
    status: { $nin: ["COMPLETED", "CANCELLED"] },
  });
  if (!workOrder) {
    workOrder = await WorkOrder.create({
      workOrderId: await nextCode(WorkOrder, "workOrderId", "WO-", 4),
      title: plan.title || `Preventive maintenance — ${equipment.name}`,
      equipmentId: equipment._id,
      departmentId: plan.departmentId || equipment.departmentId,
      engineerId,
      maintenanceType: "PREVENTIVE",
      priority: plan.priority,
      status: "IN_PROGRESS",
      scheduledDate: plan.nextDueDate,
      description: plan.instructions,
      createdBy: req.user._id,
    });
  }
  workOrder.status = "COMPLETED";
  workOrder.completedAt = completedAt;
  workOrder.startedAt = workOrder.startedAt || completedAt;
  await workOrder.save();

  let maintenance = await Maintenance.findOne({ workOrderId: workOrder._id, status: { $ne: "CANCELLED" } });
  if (!maintenance) {
    maintenance = await Maintenance.create({
      maintenanceId: await nextCode(Maintenance, "maintenanceId", "MNT-", 4),
      workOrderId: workOrder._id,
      equipmentId: equipment._id,
      departmentId: plan.departmentId || equipment.departmentId,
      engineerId,
      maintenanceType: "PREVENTIVE",
      description: plan.title,
      startTime: completedAt,
      status: "STARTED",
    });
  }
  maintenance.status = "COMPLETED";
  maintenance.endTime = completedAt;
  maintenance.preventiveAction = req.body.actionsTaken || maintenance.preventiveAction;
  maintenance.finalCondition = req.body.findings || maintenance.finalCondition;
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

  plan.lastCompletedDate = completedAt;
  plan.nextDueDate = computeNextDueDate(completedAt, plan.frequency, plan.frequencyValue);
  if (req.body.notes) plan.notes = req.body.notes;
  await plan.save();

  equipment.lastPreventiveDate = completedAt;
  equipment.nextPreventiveDate = plan.nextDueDate;
  await equipment.save();

  await logAudit({
    user: req.user,
    action: "PREVENTIVE_PLAN_COMPLETED",
    module: "PreventiveMaintenance",
    recordId: plan.preventiveMaintenanceId,
    equipmentId: equipment._id,
    workOrderId: workOrder._id,
    maintenanceId: maintenance._id,
    description: `${plan.preventiveMaintenanceId} completed — next due ${plan.nextDueDate.toISOString().slice(0, 10)}`,
  });

  return ok(res, {
    plan: withSchedule(await populatePlan(PreventiveMaintenance.findById(plan._id))),
    workOrder,
    maintenance,
    checklistResponses: savedAnswers,
    equipment,
  });
});
