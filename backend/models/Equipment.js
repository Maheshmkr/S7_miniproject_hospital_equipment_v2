import mongoose from "mongoose";

export const EQUIPMENT_STATUSES = [
  "ACTIVE",
  "UNDER_BREAKDOWN",
  "UNDER_MAINTENANCE",
  "AWAITING_PARTS",
  "MAINTENANCE_COMPLETED",
  "UNDER_VERIFICATION",
  "OPERATIONAL",
  "OUT_OF_SERVICE",
  "RETIRED",
];

export const LIFECYCLE_STAGES = [
  "PROCUREMENT",
  "RECEIVED",
  "INVENTORY",
  "ASSIGNED",
  "IN_SERVICE",
  "MAINTENANCE",
  "REPAIR",
  "CALIBRATION",
  "WARRANTY_AMC",
  "RETIRED",
  "DISPOSED",
];

export const CRITICALITY = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const equipmentSchema = new mongoose.Schema(
  {
    equipmentId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true, index: true },
    manufacturer: { type: String, trim: true },
    model: { type: String, trim: true },
    serialNumber: { type: String, trim: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    location: { type: String, trim: true },
    status: { type: String, enum: EQUIPMENT_STATUSES, default: "ACTIVE", index: true },
    lifecycleStage: { type: String, enum: LIFECYCLE_STAGES, default: "IN_SERVICE", index: true },
    condition: { type: String, trim: true },
    purchaseDate: { type: Date },
    installationDate: { type: Date },
    warrantyId: { type: mongoose.Schema.Types.ObjectId, ref: "Warranty" },
    amcId: { type: mongoose.Schema.Types.ObjectId, ref: "Warranty" },
    healthScore: { type: Number, min: 0, max: 100, default: 100 },
    criticality: { type: String, enum: CRITICALITY, default: "MEDIUM", index: true },
    cost: { type: String, trim: true },
    expectedUsefulLifeYears: { type: Number, default: 10, min: 1 },
    lastPreventiveDate: { type: Date },
    nextPreventiveDate: { type: Date },
    lastCalibrationDate: { type: Date },
    nextCalibrationDate: { type: Date },
    description: { type: String, trim: true },
    /* Attributes the existing Equipment UI captures on the register/edit forms. */
    vendor: { type: String, trim: true },
    /** Optional link to the Vendor register; the free-text `vendor` above stays authoritative for legacy rows. */
    vendorRef: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", index: true },
    owner: { type: String, trim: true },
    power: { type: String, trim: true },
    softwareVersion: { type: String, trim: true },
    riskClass: { type: String, trim: true },
    warrantyExpiry: { type: Date },
    lifecycleHistory: [
      {
        stage: { type: String, enum: LIFECYCLE_STAGES },
        fromStage: { type: String },
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamp: { type: Date, default: Date.now },
        notes: { type: String, trim: true },
        reference: { type: String, trim: true },
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

equipmentSchema.index({ name: "text", model: "text", serialNumber: "text" });

export default mongoose.model("Equipment", equipmentSchema);
