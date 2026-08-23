import mongoose from "mongoose";

export const VENDOR_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export const VENDOR_CATEGORIES = [
  "EQUIPMENT_SUPPLIER",
  "MANUFACTURER",
  "SERVICE_PROVIDER",
  "CALIBRATION_PROVIDER",
  "MAINTENANCE_PROVIDER",
  "OTHER",
];

const vendorSchema = new mongoose.Schema(
  {
    /** Human readable code (VEN-0001) — mirrors the EQ-/WO-/AMC- convention. */
    vendorId: { type: String, required: true, unique: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    legalName: { type: String, trim: true },
    category: { type: String, enum: VENDOR_CATEGORIES, default: "SERVICE_PROVIDER", index: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    alternatePhone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    city: { type: String, trim: true, index: true },
    state: { type: String, trim: true, index: true },
    country: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    taxId: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    /** Free-text service specialisation, e.g. "MRI, CT, Cath Lab". */
    specialization: { type: String, trim: true },
    status: { type: String, enum: VENDOR_STATUSES, default: "ACTIVE", index: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

vendorSchema.index({ name: "text", legalName: "text", specialization: "text" });

export default mongoose.model("Vendor", vendorSchema);
