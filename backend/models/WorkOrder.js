import mongoose from "mongoose";

export const WORK_ORDER_STATUSES = [
  "ASSIGNED",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "UNDER_VERIFICATION",
  "COMPLETED",
  "CANCELLED",
];

export const MAINTENANCE_TYPES = ["PREVENTIVE", "CORRECTIVE", "BREAKDOWN", "CALIBRATION"];

/** Legal work order lifecycle moves. Anything else is rejected with 422. */
export const WORK_ORDER_TRANSITIONS = {
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["AWAITING_PARTS", "UNDER_VERIFICATION", "COMPLETED", "CANCELLED"],
  AWAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  UNDER_VERIFICATION: ["IN_PROGRESS", "COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

const workOrderSchema = new mongoose.Schema(
  {
    workOrderId: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, required: true, trim: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    engineerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    maintenanceType: { type: String, enum: MAINTENANCE_TYPES, default: "CORRECTIVE" },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    status: { type: String, enum: WORK_ORDER_STATUSES, default: "ASSIGNED", index: true },
    scheduledDate: { type: Date },
    estimatedHours: { type: Number, min: 0 },
    startedAt: { type: Date },
    completedAt: { type: Date },
    description: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);


workOrderSchema.index({ createdAt: -1 });

export default mongoose.model("WorkOrder", workOrderSchema);
