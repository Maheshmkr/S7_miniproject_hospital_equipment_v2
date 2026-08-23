import mongoose from "mongoose";

export const ROOT_CAUSE_CATEGORIES = [
  "CALIBRATION_DRIFT",
  "COMPONENT_WEAR",
  "ELECTRICAL_FAULT",
  "SOFTWARE_FAULT",
  "USER_ERROR",
  "ENVIRONMENTAL",
  "CONSUMABLE_DEPLETION",
  "OVERDUE_PREVENTIVE_MAINTENANCE",
];

const investigationSchema = new mongoose.Schema(
  {
    maintenanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Maintenance", required: true, index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    problemObserved: { type: String, trim: true },
    diagnosticFindings: { type: String, trim: true },
    failedChecklistItems: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChecklistQuestion" }],
    rootCauseCategory: { type: String, enum: ROOT_CAUSE_CATEGORIES },
    rootCause: { type: String, trim: true },
    contributingFactor: { type: String, trim: true },
    correctiveAction: { type: String, trim: true },
    preventiveAction: { type: String, trim: true },
    partsReplaced: [{ name: String, partNo: String, qty: Number, cost: Number }],
    engineerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Investigation", investigationSchema);
