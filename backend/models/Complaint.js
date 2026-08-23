import mongoose from "mongoose";

export const COMPLAINT_STATUSES = [
  "OPEN",
  "UNDER_REVIEW",
  "ASSIGNED",
  "INVESTIGATION",
  "MAINTENANCE_IN_PROGRESS",
  "AWAITING_PARTS",
  "TESTING",
  "RESOLVED",
  "CLOSED",
];

export const COMPLAINT_TRANSITIONS = {
  OPEN: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["ASSIGNED"],
  ASSIGNED: ["INVESTIGATION"],
  INVESTIGATION: ["MAINTENANCE_IN_PROGRESS"],
  MAINTENANCE_IN_PROGRESS: ["AWAITING_PARTS", "TESTING"],
  AWAITING_PARTS: ["MAINTENANCE_IN_PROGRESS"],
  TESTING: ["RESOLVED", "MAINTENANCE_IN_PROGRESS"],
  RESOLVED: ["CLOSED"],
  CLOSED: [],
};

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const messageSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    authorName: String,
    role: String,
    body: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const complaintSchema = new mongoose.Schema(
  {
    complaintId: { type: String, required: true, unique: true, trim: true, index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    assignedEngineerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder" },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    priority: { type: String, enum: PRIORITIES, default: "MEDIUM", index: true },
    status: { type: String, enum: COMPLAINT_STATUSES, default: "OPEN", index: true },
    resolution: { type: String, trim: true },
    evidence: [{ type: mongoose.Schema.Types.ObjectId, ref: "Evidence" }],
    messages: [messageSchema],
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

complaintSchema.index({ createdAt: -1 });

export default mongoose.model("Complaint", complaintSchema);
