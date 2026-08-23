import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    userName: { type: String },
    role: { type: String },
    action: { type: String, required: true, index: true },
    module: {
      type: String,
      enum: [
        "Auth",
        "User",
        "Department",
        "Equipment",
        "Complaint",
        "WorkOrder",
        "Maintenance",
        "PreventiveMaintenance",
        "Calibration",
        "Checklist",
        "ServiceReport",
        "Warranty",
        "Vendor",
        "PurchaseOrder",
        "Inventory",
        "Notification",
        "Audit",
      ],
      required: true,
      index: true,
    },
    recordId: { type: String, index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", index: true },
    maintenanceId: { type: mongoose.Schema.Types.ObjectId, ref: "Maintenance", index: true },
    previousStatus: { type: String },
    newStatus: { type: String },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false },
);

export default mongoose.model("AuditLog", auditLogSchema);
