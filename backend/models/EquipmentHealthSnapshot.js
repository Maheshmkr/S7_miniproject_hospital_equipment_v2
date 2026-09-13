import mongoose from "mongoose";

const breakdownComponentSchema = new mongoose.Schema(
  {
    score: { type: Number, required: true },
    max: { type: Number, required: true },
    normalized: { type: Number, required: true },
    weight: { type: Number, required: true },
    applicable: { type: Boolean, default: true },
  },
  { _id: false },
);

const equipmentHealthSnapshotSchema = new mongoose.Schema(
  {
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    equipmentCode: { type: String, required: true, trim: true, index: true },
    healthScore: { type: Number, required: true, min: 0, max: 100 },
    healthStatus: {
      type: String,
      enum: ["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"],
      required: true,
      index: true,
    },
    calculatedScore: { type: Number, required: true },
    isCapped: { type: Boolean, default: false },
    capReason: { type: String, default: null },
    breakdown: {
      operational: breakdownComponentSchema,
      complaints: breakdownComponentSchema,
      maintenance: breakdownComponentSchema,
      preventiveMaintenance: breakdownComponentSchema,
      calibration: breakdownComponentSchema,
      warranty: breakdownComponentSchema,
      safety: breakdownComponentSchema,
    },
    metrics: { type: mongoose.Schema.Types.Mixed, default: {} },
    triggerEvent: { type: String, trim: true },
    recordedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

equipmentHealthSnapshotSchema.index({ equipmentId: 1, recordedAt: -1 });

export default mongoose.model("EquipmentHealthSnapshot", equipmentHealthSnapshotSchema);
