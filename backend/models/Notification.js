import mongoose from "mongoose";

export const NOTIFICATION_TYPES = [
  "MAINTENANCE_DUE",
  "PREVENTIVE_DUE",
  "CALIBRATION_DUE",
  "WARRANTY_EXPIRY",
  "AMC_EXPIRY",
  "COMPLAINT_UPDATE",
  "WORK_ORDER_UPDATE",
  "LOW_INVENTORY_STOCK",
  "INVENTORY_EXPIRY",
  "PURCHASE_ORDER_STATUS",
  "GENERAL",
];

export const NOTIFICATION_SEVERITIES = ["INFO", "WARNING", "DANGER", "SUCCESS"];

const notificationSchema = new mongoose.Schema(
  {
    notificationId: { type: String, trim: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    role: { type: String, trim: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: "GENERAL", index: true },
    severity: { type: String, enum: NOTIFICATION_SEVERITIES, default: "INFO", index: true },
    sourceModule: { type: String, trim: true, index: true },
    sourceId: { type: String, trim: true },
    link: { type: String, trim: true },
    readBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt: { type: Date, default: Date.now },
      },
    ],
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export default mongoose.model("Notification", notificationSchema);
