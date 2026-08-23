import mongoose from "mongoose";

/**
 * Number of days before `endDate` at which a contract is reported as EXPIRING.
 * Configurable so the rule is defined in exactly one place.
 */
export const WARRANTY_EXPIRING_DAYS = Number.parseInt(process.env.WARRANTY_EXPIRING_DAYS || "60", 10);

export const WARRANTY_STATUSES = ["ACTIVE", "EXPIRING", "EXPIRED", "CANCELLED"];
export const WARRANTY_KINDS = ["WARRANTY", "AMC"];

const warrantySchema = new mongoose.Schema(
  {
    warrantyId: { type: String, required: true, unique: true, trim: true, index: true },
    /** WARRANTY or AMC — the frontend renders both in one Warranty & AMC workspace. */
    kind: { type: String, enum: WARRANTY_KINDS, default: "WARRANTY", index: true },
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", required: true, index: true },
    /** Denormalised from the covered equipment so department scoping stays a single query. */
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    /** Legacy free-text vendor name — kept for backward compatibility. */
    vendor: { type: String, trim: true },
    /** Optional link to the Vendor register; old records simply leave this unset. */
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", index: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true, index: true },
    coverage: { type: String, trim: true },
    /** Contract terms / exclusions — free text, mirrors the existing UI field. */
    terms: { type: String, trim: true },
    contractNumber: { type: String, trim: true },
    contractType: { type: String, trim: true },
    value: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    status: {
      type: String,
      enum: WARRANTY_STATUSES,
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true },
);

/** daysRemaining is always derived, never persisted. */
warrantySchema.virtual("daysRemaining").get(function daysRemaining() {
  if (!this.endDate) return null;
  return Math.ceil((this.endDate.getTime() - Date.now()) / 86_400_000);
});

warrantySchema.set("toJSON", { virtuals: true });
warrantySchema.set("toObject", { virtuals: true });

/** Derived lifecycle state — CANCELLED is the only persisted override. */
export function warrantyState(doc, now = Date.now()) {
  if (doc.status === "CANCELLED") return { status: "CANCELLED", daysRemaining: null };
  const end = new Date(doc.endDate).getTime();
  const start = doc.startDate ? new Date(doc.startDate).getTime() : null;
  const days = Math.ceil((end - now) / 86_400_000);
  if (days < 0) return { status: "EXPIRED", daysRemaining: days };
  if (start && start > now) return { status: "ACTIVE", daysRemaining: days, upcoming: true };
  if (days <= WARRANTY_EXPIRING_DAYS) return { status: "EXPIRING", daysRemaining: days };
  return { status: "ACTIVE", daysRemaining: days };
}

export default mongoose.model("Warranty", warrantySchema);
