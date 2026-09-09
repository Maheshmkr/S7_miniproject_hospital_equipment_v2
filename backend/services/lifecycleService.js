import Equipment from "../models/Equipment.js";
import Complaint, { COMPLAINT_TRANSITIONS } from "../models/Complaint.js";
import { ApiError } from "./apiError.js";
import { logAudit } from "./auditService.js";

/** Generate the next sequential business code for a collection. */
export async function nextCode(Model, field, prefix, pad = 4) {
  const docs = await Model.find({ [field]: new RegExp(`^${prefix}`) })
    .select(field)
    .lean();
  let maxNum = 0;
  for (const doc of docs) {
    const raw = String(doc[field] || "");
    if (raw.startsWith(prefix)) {
      const suffix = raw.slice(prefix.length);
      const num = Number.parseInt(suffix, 10);
      if (!Number.isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(pad, "0")}`;
}

export async function setEquipmentStatus(equipment, status, user, description) {
  if (!equipment) throw new ApiError(404, "Equipment not found");
  const previous = equipment.status;
  if (previous === status) return equipment;
  equipment.status = status;
  await equipment.save();
  await logAudit({
    user,
    action: "EQUIPMENT_STATUS_CHANGED",
    module: "Equipment",
    recordId: equipment.equipmentId,
    equipmentId: equipment._id,
    previousStatus: previous,
    newStatus: status,
    description: description || `${equipment.equipmentId} moved ${previous} → ${status}`,
  });
  return equipment;
}

export async function setComplaintStatus(complaint, status, user, { force = false } = {}) {
  if (!complaint) return null;
  const previous = complaint.status;
  if (previous === status) {
    if (status === "RESOLVED" && !complaint.resolvedAt) {
      complaint.resolvedAt = new Date();
      await complaint.save();
    }
    return complaint;
  }
  const allowed = COMPLAINT_TRANSITIONS[previous] || [];
  if (!force && !allowed.includes(status)) {
    throw new ApiError(422, `Complaint cannot move ${previous} → ${status}`);
  }
  complaint.status = status;
  if (status === "RESOLVED" && !complaint.resolvedAt) complaint.resolvedAt = new Date();
  await complaint.save();
  await logAudit({
    user,
    action: "COMPLAINT_STATUS_CHANGED",
    module: "Complaint",
    recordId: complaint.complaintId,
    equipmentId: complaint.equipmentId,
    previousStatus: previous,
    newStatus: status,
    description: `${complaint.complaintId} moved ${previous} → ${status}`,
  });
  return complaint;
}

export const LIFECYCLE_TRANSITIONS = {
  PROCUREMENT: ["RECEIVED", "DISPOSED"],
  RECEIVED: ["INVENTORY", "ASSIGNED", "DISPOSED"],
  INVENTORY: ["ASSIGNED", "IN_SERVICE", "DISPOSED"],
  ASSIGNED: ["IN_SERVICE", "MAINTENANCE", "CALIBRATION", "RETIRED"],
  IN_SERVICE: ["MAINTENANCE", "REPAIR", "CALIBRATION", "WARRANTY_AMC", "INVENTORY", "RETIRED"],
  MAINTENANCE: ["IN_SERVICE", "REPAIR", "CALIBRATION", "RETIRED"],
  REPAIR: ["IN_SERVICE", "MAINTENANCE", "CALIBRATION", "RETIRED"],
  CALIBRATION: ["IN_SERVICE", "MAINTENANCE", "REPAIR", "RETIRED"],
  WARRANTY_AMC: ["IN_SERVICE", "MAINTENANCE", "RETIRED"],
  RETIRED: ["DISPOSED", "IN_SERVICE"],
  DISPOSED: [],
};

export async function setEquipmentLifecycleStage(equipment, stage, user, { reason = "", reference = "" } = {}) {
  if (!equipment) throw new ApiError(404, "Equipment not found");
  const previous = equipment.lifecycleStage || "IN_SERVICE";
  if (previous === stage) return equipment;

  equipment.lifecycleStage = stage;
  if (!equipment.lifecycleHistory) equipment.lifecycleHistory = [];
  equipment.lifecycleHistory.push({
    stage,
    fromStage: previous,
    user: user?._id,
    timestamp: new Date(),
    notes: reason,
    reference,
  });
  await equipment.save();

  await logAudit({
    user,
    action: "EQUIPMENT_LIFECYCLE_TRANSITION",
    module: "Equipment",
    recordId: equipment.equipmentId,
    equipmentId: equipment._id,
    previousStatus: previous,
    newStatus: stage,
    description: `Lifecycle transition: ${equipment.equipmentId} moved ${previous} → ${stage}. Reason: ${reason || "N/A"}`,
  });

  return equipment;
}

export async function loadEquipmentOr404(id) {
  const eq = await Equipment.findById(id);
  if (!eq) throw new ApiError(404, "Equipment not found");
  return eq;
}

export async function loadComplaint(id) {
  return id ? Complaint.findById(id) : null;
}

