import mongoose from "mongoose";
import { MAINTENANCE_TYPES as WORK_ORDER_MAINTENANCE_TYPES } from "./WorkOrder.js";

export const MAINTENANCE_STATUSES = [
  "STARTED",
  "INVESTIGATION",
  "IN_PROGRESS",
  "AWAITING_PARTS",
  "TESTING",
  "COMPLETED",
  "CANCELLED",
];

/** Shared with the work order module — one vocabulary, no duplicate enum. */
export const MAINTENANCE_TYPES = WORK_ORDER_MAINTENANCE_TYPES;

/** Legal maintenance execution moves. Anything else is rejected with 422. */
export const MAINTENANCE_TRANSITIONS = {
  STARTED: ["INVESTIGATION", "IN_PROGRESS", "AWAITING_PARTS", "CANCELLED"],
  INVESTIGATION: ["IN_PROGRESS", "AWAITING_PARTS", "CANCELLED"],
  IN_PROGRESS: ["AWAITING_PARTS", "TESTING", "COMPLETED", "CANCELLED"],
  AWAITING_PARTS: ["IN_PROGRESS", "TESTING", "CANCELLED"],
  TESTING: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const partSchema = new mongoose.Schema(
  { name: String, partNo: String, qty: Number, cost: Number },
  { _id: false },
);

const verificationSchema = new mongoose.Schema(
  {
    safetyVerified: { type: Boolean, default: false },
    performanceVerified: { type: Boolean, default: false },
    tests: [{ name: String, expected: String, actual: String, pass: Boolean }],
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    verifiedAt: Date,
  },
  { _id: false },
);

const maintenanceSchema = new mongoose.Schema(
  {
    maintenanceId: { type: String, required: true, unique: true, trim: true, index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", required: true, index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    engineerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    maintenanceType: { type: String, enum: MAINTENANCE_TYPES, default: "CORRECTIVE" },
    description: { type: String, trim: true },
    startTime: { type: Date },
    endTime: { type: Date },
    status: { type: String, enum: MAINTENANCE_STATUSES, default: "STARTED", index: true },
    initialCondition: { type: String, trim: true },
    safetyPrecautions: { type: String, trim: true },
    checklistResponses: [{ type: mongoose.Schema.Types.ObjectId, ref: "ChecklistResponse" }],
    investigationId: { type: mongoose.Schema.Types.ObjectId, ref: "Investigation" },
    rootCause: { type: String, trim: true },
    contributingFactor: { type: String, trim: true },
    correctiveAction: { type: String, trim: true },
    preventiveAction: { type: String, trim: true },
    partsUsed: [partSchema],
    verification: verificationSchema,
    finalCondition: { type: String, trim: true },
    remarks: { type: String, trim: true },
    serviceReportId: { type: mongoose.Schema.Types.ObjectId, ref: "ServiceReport" },
  },
  { timestamps: true },
);

maintenanceSchema.index({ createdAt: -1 });

export default mongoose.model("Maintenance", maintenanceSchema);
