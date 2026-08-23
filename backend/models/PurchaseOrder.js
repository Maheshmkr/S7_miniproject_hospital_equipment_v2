import mongoose from "mongoose";

export const PO_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "ORDERED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

export const PO_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

/** Legal lifecycle moves — anything outside this map is a 422. */
export const PO_TRANSITIONS = {
  DRAFT: ["PENDING_APPROVAL", "CANCELLED"],
  PENDING_APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["ORDERED", "CANCELLED"],
  REJECTED: ["DRAFT", "CANCELLED"],
  ORDERED: ["PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"],
  PARTIALLY_RECEIVED: ["RECEIVED", "CANCELLED"],
  RECEIVED: [],
  CANCELLED: [],
};

/** Statuses after which financial content is frozen. */
export const PO_LOCKED_STATUSES = ["APPROVED", "ORDERED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"];

/**
 * Embedded line item. Money fields are always recomputed server-side —
 * `total` is persisted only so historical documents stay self-describing.
 */
const purchaseOrderItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    itemCode: { type: String, trim: true },
    /** Optional link to an existing asset — procurement of spares for a known device. */
    equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment" },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    /** Percentages, 0-100. */
    taxRate: { type: Number, min: 0, max: 100, default: 0 },
    discountRate: { type: Number, min: 0, max: 100, default: 0 },
    taxAmount: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    specification: { type: String, trim: true },
    notes: { type: String, trim: true },
    /** Reserved for the future Goods Received step — never written in Step 10. */
    receivedQuantity: { type: Number, min: 0, default: 0 },
  },
  { _id: true },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    /** Human readable code (PO-0001) — mirrors EQ-/WO-/VEN- conventions. */
    purchaseOrderId: { type: String, required: true, unique: true, trim: true, index: true },
    /** Vendor-facing reference, defaults to purchaseOrderId when not supplied. */
    poNumber: { type: String, trim: true, index: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true, index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    rejectedAt: { type: Date },
    rejectionReason: { type: String, trim: true },
    title: { type: String, trim: true },
    orderDate: { type: Date, default: Date.now, index: true },
    expectedDeliveryDate: { type: Date },
    deliveryDate: { type: Date },
    status: { type: String, enum: PO_STATUSES, default: "DRAFT", index: true },
    priority: { type: String, enum: PO_PRIORITIES, default: "MEDIUM", index: true },
    items: { type: [purchaseOrderItemSchema], default: [] },
    /** All monetary figures are derived by purchaseOrderService.computeTotals. */
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0, index: true },
    currency: { type: String, trim: true, uppercase: true, default: "USD" },
    paymentTerms: { type: String, trim: true },
    deliveryAddress: { type: String, trim: true },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

purchaseOrderSchema.index({ title: "text", notes: "text" });

export default mongoose.model("PurchaseOrder", purchaseOrderSchema);
