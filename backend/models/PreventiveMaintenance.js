import mongoose from "mongoose";

/** Planned-maintenance frequency vocabulary. */
export const PM_FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"];

/** Derived schedule states — never stored, always calculated from nextDueDate. */
export const PM_SCHEDULE_STATES = ["OVERDUE", "DUE_TODAY", "UPCOMING", "COMPLETED", "INACTIVE"];

const preventiveMaintenanceSchema = new mongoose.Schema(
  {
    preventiveMaintenanceId: { type: String, required: true, unique: true, trim: true, index: true },
    title: { type: String, trim: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    assignedEngineerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    /** Reuses the existing checklist module — no duplicate checklist system. */
    checklistTemplateId: { type: mongoose.Schema.Types.ObjectId, ref: "ChecklistTemplate" },
    frequency: { type: String, enum: PM_FREQUENCIES, required: true, default: "QUARTERLY" },
    /** Multiplier on the frequency unit — e.g. frequency MONTHLY + value 2 = every 2 months. */
    frequencyValue: { type: Number, min: 1, default: 1 },
    startDate: { type: Date, required: true },
    nextDueDate: { type: Date, required: true, index: true },
    lastCompletedDate: { type: Date },
    priority: { type: String, enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"], default: "MEDIUM" },
    instructions: { type: String, trim: true },
    notes: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

preventiveMaintenanceSchema.index({ nextDueDate: 1, active: 1 });

export default mongoose.model("PreventiveMaintenance", preventiveMaintenanceSchema);
