import mongoose from "mongoose";

/** Administrator-defined post-maintenance governance audit (separate from AuditLog trail). */
const auditQuestionSchema = new mongoose.Schema(
  {
    prompt: String,
    type: { type: String, enum: ["YES_NO", "TEXT", "NUMBER", "DATE", "DROPDOWN", "EVIDENCE"] },
    required: { type: Boolean, default: true },
    options: [String],
    helper: String,
  },
  { _id: true },
);

export const AuditTemplate = mongoose.model(
  "AuditTemplate",
  new mongoose.Schema(
    {
      name: { type: String, required: true },
      scope: { type: String },
      description: { type: String },
      active: { type: Boolean, default: true },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      questions: [auditQuestionSchema],
    },
    { timestamps: true },
  ),
);

const auditInstanceSchema = new mongoose.Schema(
  {
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "AuditTemplate", required: true, index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", index: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint" },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    dueBy: { type: Date },
    status: {
      type: String,
      enum: ["ASSIGNED", "IN_PROGRESS", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "ASSIGNED",
      index: true,
    },
    answers: [{ questionId: String, value: String, evidence: String }],
    submittedAt: Date,
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewNote: String,
  },
  { timestamps: true },
);

export default mongoose.model("AuditInstance", auditInstanceSchema);
