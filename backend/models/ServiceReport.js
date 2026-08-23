import mongoose from "mongoose";

const serviceReportSchema = new mongoose.Schema(
  {
    serviceReportId: { type: String, required: true, unique: true, trim: true, index: true },
    maintenanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Maintenance", required: true, index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    engineerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    problem: { type: String, trim: true },
    diagnosticFindings: { type: String, trim: true },
    checklistResults: [
      { question: String, response: String, outcome: String, notes: String },
    ],
    rootCause: { type: String, trim: true },
    correctiveAction: { type: String, trim: true },
    preventiveAction: { type: String, trim: true },
    partsUsed: [{ name: String, partNo: String, qty: Number, cost: Number }],
    evidence: [{ type: mongoose.Schema.Types.ObjectId, ref: "Evidence" }],
    testResult: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
    finalCondition: { type: String, trim: true },
    engineerRemarks: { type: String, trim: true },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
      default: "SUBMITTED",
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
    reviewNote: { type: String, trim: true },
  },
  { timestamps: true },
);

export default mongoose.model("ServiceReport", serviceReportSchema);
