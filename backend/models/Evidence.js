import mongoose from "mongoose";

const evidenceSchema = new mongoose.Schema(
  {
    maintenanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Maintenance", index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: "Complaint", index: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    category: {
      type: String,
      enum: ["BEFORE", "AFTER", "DOCUMENT", "TEST_RESULT", "PART", "OTHER"],
      default: "DOCUMENT",
    },
    fileName: { type: String, required: true },
    /** Storage pointer only — binaries never live inside the document. */
    fileUrl: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    note: { type: String, trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default mongoose.model("Evidence", evidenceSchema);
