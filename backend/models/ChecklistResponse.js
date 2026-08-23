import mongoose from "mongoose";

const checklistResponseSchema = new mongoose.Schema(
  {
    maintenanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Maintenance", required: true, index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChecklistQuestion", required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "ChecklistTemplate" },
    engineerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    /** Raw captured answer (PASS/FAIL, YES/NO, text, number, ISO date, dropdown option). */
    response: { type: String, required: true },
    /** Normalised outcome used by validation, RCA and analytics. */
    outcome: { type: String, enum: ["PASS", "FAIL", "NA", "ANSWERED"], default: "ANSWERED" },
    notes: { type: String, trim: true },
    evidence: [{ type: mongoose.Schema.Types.ObjectId, ref: "Evidence" }],
  },
  { timestamps: true },
);

checklistResponseSchema.index({ maintenanceId: 1, questionId: 1 }, { unique: true });

export default mongoose.model("ChecklistResponse", checklistResponseSchema);
