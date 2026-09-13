import mongoose from "mongoose";
import Equipment, { CRITICALITY, EQUIPMENT_STATUSES, LIFECYCLE_STAGES } from "../models/Equipment.js";
import Department from "../models/Department.js";
import Complaint from "../models/Complaint.js";
import WorkOrder from "../models/WorkOrder.js";
import Maintenance from "../models/Maintenance.js";
import ServiceReport from "../models/ServiceReport.js";
import AuditLog from "../models/AuditLog.js";
import Warranty from "../models/Warranty.js";
import { ApiError, asyncHandler, created, ok } from "../services/apiError.js";
import { assertDate, assertEnum, findByAnyId, paginate, requireFields } from "../services/validate.js";
import { logAudit } from "../services/auditService.js";
import { nextCode, setEquipmentLifecycleStage, setEquipmentStatus } from "../services/lifecycleService.js";
import { resolveChecklistForEquipment } from "../services/checklistService.js";
import { calculateEquipmentEhs } from "../services/ehsService.js";
import { getHealthScoreHistory } from "../services/healthScoreService.js";

export const loadEquipment = async (id) => {
  const eq = await findByAnyId(Equipment, id, "equipmentId");
  if (!eq) throw new ApiError(404, "Equipment not found");
  return eq;
};

/** Resolve departmentId from ObjectId string, department code (e.g. "RAD"), or department name. */
export const resolveDepartmentId = async (input) => {
  if (!input) return null;
  if (mongoose.Types.ObjectId.isValid(input)) {
    const byId = await Department.findById(input);
    if (byId) return byId._id;
  }
  const clean = String(input).trim();
  const byCode = await Department.findOne({ code: clean.toUpperCase() });
  if (byCode) return byCode._id;
  const byName = await Department.findOne({ name: new RegExp(`^${clean}$`, "i") });
  if (byName) return byName._id;
  return null;
};

/** Department staff may only read assets that belong to their own department. */
const assertDepartmentAccess = (user, eq) => {
  if (user.role !== "DEPARTMENT_STAFF" || !user.departmentId) return;
  if (String(eq.departmentId || "") !== String(user.departmentId)) {
    throw new ApiError(403, "You do not have access to this equipment");
  }
};

const DATE_FIELDS = ["purchaseDate", "installationDate", "lastPreventiveDate", "nextPreventiveDate", "warrantyExpiry"];

/** Coerce/validate the writable payload; unknown keys are ignored by the schema. */
const normalizeBody = async (body) => {
  const out = { ...body };
  for (const f of DATE_FIELDS) {
    if (f in out) {
      const parsed = assertDate(out[f], f);
      if (parsed === undefined) delete out[f];
      else out[f] = parsed;
    }
  }
  if (out.healthScore !== undefined && out.healthScore !== "") {
    const n = Number(out.healthScore);
    if (Number.isNaN(n) || n < 0 || n > 100) throw new ApiError(400, "healthScore must be between 0 and 100");
    out.healthScore = n;
  } else {
    delete out.healthScore;
  }
  if (out.expectedUsefulLifeYears !== undefined && out.expectedUsefulLifeYears !== "") {
    const n = Number(out.expectedUsefulLifeYears);
    if (!Number.isNaN(n) && n > 0) out.expectedUsefulLifeYears = n;
    else delete out.expectedUsefulLifeYears;
  }
  if (out.departmentId !== undefined) {
    if (out.departmentId === "" || out.departmentId === null) {
      out.departmentId = null;
    } else {
      const resolved = await resolveDepartmentId(out.departmentId);
      out.departmentId = resolved || undefined;
    }
  }
  delete out._id;
  delete out.createdBy;
  return out;
};

/** Business rule: equipment code and serial number must stay unique. */
const assertUnique = async ({ equipmentId, serialNumber }, excludeId) => {
  const base = excludeId ? { _id: { $ne: excludeId } } : {};
  if (equipmentId) {
    const clash = await Equipment.findOne({ ...base, equipmentId });
    if (clash) throw new ApiError(409, `Equipment ID ${equipmentId} is already registered`);
  }
  if (serialNumber) {
    const clash = await Equipment.findOne({ ...base, serialNumber });
    if (clash) throw new ApiError(409, `Serial number ${serialNumber} is already registered`);
  }
};

export const listEquipment = asyncHandler(async (req, res) => {
  const { search, status, departmentId, category, criticality } = req.query;
  const { page, limit, skip } = paginate(req.query);
  const filter = {};
  if (status) filter.status = status;
  if (departmentId) {
    const resolvedDept = await resolveDepartmentId(departmentId);
    filter.departmentId = resolvedDept || departmentId;
  }
  if (category) filter.category = category;
  if (criticality) filter.criticality = criticality;
  if (req.user.role === "DEPARTMENT_STAFF" && req.user.departmentId) {
    filter.departmentId = req.user.departmentId;
  }
  if (search) {
    filter.$or = [
      { name: new RegExp(search, "i") },
      { equipmentId: new RegExp(search, "i") },
      { serialNumber: new RegExp(search, "i") },
      { model: new RegExp(search, "i") },
    ];
  }

  const [items, total] = await Promise.all([
    Equipment.find(filter).populate("departmentId", "name code").sort({ equipmentId: 1 }).skip(skip).limit(limit),
    Equipment.countDocuments(filter),
  ]);
  return ok(res, { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
});

export const getEquipment = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  assertDepartmentAccess(req.user, eq);
  await eq.populate("departmentId", "name code");
  return ok(res, eq);
});

export const createEquipment = asyncHandler(async (req, res) => {
  requireFields(req.body, ["name", "category"]);
  assertEnum(req.body.status, EQUIPMENT_STATUSES, "status");
  assertEnum(req.body.criticality, CRITICALITY, "criticality");
  const payload = await normalizeBody(req.body);
  const equipmentId = payload.equipmentId || (await nextCode(Equipment, "equipmentId", "EQ-", 4));
  await assertUnique({ equipmentId, serialNumber: payload.serialNumber });
  const eq = await Equipment.create({ ...payload, equipmentId, createdBy: req.user._id });
  await eq.populate("departmentId", "name code");
  await logAudit({
    user: req.user,
    action: "EQUIPMENT_CREATED",
    module: "Equipment",
    recordId: eq.equipmentId,
    equipmentId: eq._id,
    newStatus: eq.status,
    description: `${eq.equipmentId} · ${eq.name} registered`,
  });
  return created(res, eq, "Equipment registered");
});

export const updateEquipment = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  assertEnum(req.body.criticality, CRITICALITY, "criticality");
  // Status changes go through PATCH /:id/status so the lifecycle audit stays intact.
  const { status, ...rest } = await normalizeBody(req.body);
  await assertUnique({ equipmentId: rest.equipmentId, serialNumber: rest.serialNumber }, eq._id);
  Object.assign(eq, rest);
  await eq.save();
  await eq.populate("departmentId", "name code");
  await logAudit({
    user: req.user,
    action: "EQUIPMENT_UPDATED",
    module: "Equipment",
    recordId: eq.equipmentId,
    equipmentId: eq._id,
    description: `${eq.equipmentId} updated`,
  });
  return ok(res, eq, "Equipment updated");
});


export const updateEquipmentStatus = asyncHandler(async (req, res) => {
  assertEnum(req.body.status, EQUIPMENT_STATUSES, "status");
  const eq = await loadEquipment(req.params.id);
  await setEquipmentStatus(eq, req.body.status, req.user, req.body.reason);
  return ok(res, eq);
});

export const updateEquipmentLifecycle = asyncHandler(async (req, res) => {
  assertEnum(req.body.stage, LIFECYCLE_STAGES, "stage");
  const eq = await loadEquipment(req.params.id);
  await setEquipmentLifecycleStage(eq, req.body.stage, req.user, {
    reason: req.body.reason,
    reference: req.body.reference,
  });
  return ok(res, eq, `Lifecycle stage transitioned to ${req.body.stage}`);
});

export const deleteEquipment = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  const openWork = await WorkOrder.countDocuments({ equipmentId: eq._id, status: { $nin: ["COMPLETED", "CANCELLED"] } });
  if (openWork) throw new ApiError(409, "Equipment has open work orders");
  const openComplaints = await Complaint.countDocuments({ equipmentId: eq._id, status: { $nin: ["RESOLVED", "CLOSED"] } });
  if (openComplaints) throw new ApiError(409, "Equipment has open complaints");
  await eq.deleteOne();
  await logAudit({ user: req.user, action: "EQUIPMENT_DELETED", module: "Equipment", recordId: eq.equipmentId, description: `${eq.equipmentId} deleted` });
  return ok(res, null, "Equipment deleted");
});


export const equipmentComplaints = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  return ok(res, await Complaint.find({ equipmentId: eq._id }).populate("assignedEngineerId", "name").sort({ createdAt: -1 }));
});

export const equipmentMaintenance = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  const [workOrders, maintenance] = await Promise.all([
    WorkOrder.find({ equipmentId: eq._id }).populate("engineerId", "name").sort({ createdAt: -1 }),
    Maintenance.find({ equipmentId: eq._id }).sort({ createdAt: -1 }),
  ]);
  return ok(res, { workOrders, maintenance });
});

export const equipmentServiceReports = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  return ok(res, await ServiceReport.find({ equipmentId: eq._id }).populate("engineerId", "name").sort({ createdAt: -1 }));
});

export const equipmentAudit = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  return ok(res, await AuditLog.find({ equipmentId: eq._id }).sort({ timestamp: -1 }).limit(300));
});

export const equipmentHistory = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  const [complaints, workOrders, reports, events, warranties] = await Promise.all([
    Complaint.find({ equipmentId: eq._id }).sort({ createdAt: -1 }),
    WorkOrder.find({ equipmentId: eq._id }).sort({ createdAt: -1 }),
    ServiceReport.find({ equipmentId: eq._id }).sort({ createdAt: -1 }),
    AuditLog.find({ equipmentId: eq._id }).sort({ timestamp: -1 }).limit(300),
    Warranty.find({ equipmentId: eq._id }),
  ]);
  return ok(res, { equipment: eq, complaints, workOrders, reports, events, warranties });
});

export const equipmentChecklist = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.equipmentId || req.params.id);
  const resolved = await resolveChecklistForEquipment(eq, req.query.maintenanceType);
  return ok(res, { equipment: { id: eq._id, equipmentId: eq.equipmentId, name: eq.name, category: eq.category }, ...resolved });
});

export const equipmentWarranty = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.equipmentId || req.params.id);
  return ok(res, await Warranty.find({ equipmentId: eq._id }).sort({ endDate: 1 }));
});

export const getEquipmentHealthScore = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  assertDepartmentAccess(req.user, eq);
  const data = await calculateEquipmentEhs(eq);
  if (!data) throw new ApiError(404, "Equipment health score could not be calculated");
  return ok(res, data);
});

export const getEquipmentHealthHistory = asyncHandler(async (req, res) => {
  const eq = await loadEquipment(req.params.id);
  assertDepartmentAccess(req.user, eq);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const history = await getHealthScoreHistory(eq, limit);
  return ok(res, history);
});

