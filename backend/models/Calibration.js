import mongoose from "mongoose";

/** Calibration interval vocabulary — CUSTOM uses `frequencyDays`. */
export const CALIBRATION_FREQUENCIES = ["MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY", "CUSTOM"];

export const CALIBRATION_TYPES = ["INTERNAL", "EXTERNAL", "VENDOR"];

export const CALIBRATION_STATUSES = ["SCHEDULED", "IN_PROGRESS", "PASSED", "FAILED", "CANCELLED"];

/** Legal status transitions — enforced by the controller. */
export const CALIBRATION_TRANSITIONS = {
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["PASSED", "FAILED", "CANCELLED"],
  PASSED: [],
  FAILED: ["IN_PROGRESS"],
  CANCELLED: [],
};

export const CALIBRATION_RESULTS = ["PASS", "FAIL", "CONDITIONAL"];

/** Derived schedule states — never stored, always recalculated. */
export const CALIBRATION_SCHEDULE_STATES = ["OVERDUE", "DUE_TODAY", "UPCOMING", "COMPLETED", "INACTIVE"];

const measuredValueSchema = new mongoose.Schema(
  {
    parameter: { type: String, trim: true },
    unit: { type: String, trim: true },
    reference: { type: String, trim: true },
    measured: { type: String, trim: true },
    tolerance: { type: String, trim: true },
    withinTolerance: { type: Boolean },
  },
  { _id: false },
);

const calibrationSchema = new mongoose.Schema(
  {
    calibrationId: { type: String, required: true, unique: true, trim: true, index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    assignedEngineerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    /** Reused lifecycle records — never duplicated. */
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", index: true },
    maintenanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Maintenance", index: true },
    /** Existing checklist module — no separate checklist architecture. */
    checklistTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "ChecklistTemplate" },
    title: { type: String, trim: true },
    calibrationType: { type: String, enum: CALIBRATION_TYPES, default: "INTERNAL" },
    calibrationStandard: { type: String, trim: true },
    frequency: { type: String, enum: CALIBRATION_FREQUENCIES, default: "YEARLY" },
    /** Only used when frequency is CUSTOM. */
    frequencyDays: { type: Number, min: 1 },
    scheduledDate: { type: Date, required: true, index: true },
    calibrationDate: { type: Date },
    nextCalibrationDate: { type: Date, index: true },
    status: { type: String, enum: CALIBRATION_STATUSES, default: "SCHEDULED", index: true },
    result: { type: String, enum: CALIBRATION_RESULTS },
    certificateNumber: { type: String, trim: true },
    certificateUrl: { type: String, trim: true },
    measuredValues: { type: [measuredValueSchema], default: [] },
    tolerance: { type: String, trim: true },
    findings: { type: String, trim: true },
    correctiveAction: { type: String, trim: true },
    notes: { type: String, trim: true },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

calibrationSchema.index({ scheduledDate: 1, status: 1 });

export default mongoose.model("Calibration", calibrationSchema);
