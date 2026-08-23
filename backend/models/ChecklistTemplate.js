import mongoose from "mongoose";

const checklistTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    equipmentCategory: { type: String, trim: true, index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    maintenanceType: {
      type: String,
      enum: ["PREVENTIVE", "CORRECTIVE", "BREAKDOWN", "CALIBRATION", "ALL"],
      default: "ALL",
    },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("ChecklistTemplate", checklistTemplateSchema);
