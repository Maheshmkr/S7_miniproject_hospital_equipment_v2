import mongoose from "mongoose";

export const MOVEMENT_TYPES = ["RECEIPT", "ISSUE", "RETURN", "ADJUSTMENT", "TRANSFER"];

const stockMovementSchema = new mongoose.Schema(
  {
    movementId: { type: String, required: true, unique: true, trim: true, index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "InventoryItem", required: true, index: true },
    type: { type: String, enum: MOVEMENT_TYPES, required: true, index: true },
    quantity: { type: Number, required: true, min: 0 },
    previousQuantity: { type: Number, required: true, min: 0 },
    newQuantity: { type: Number, required: true, min: 0 },
    reference: { type: String, trim: true },
    relatedEquipmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Equipment", index: true },
    relatedPurchaseOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder", index: true },
    relatedWorkOrderId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkOrder", index: true },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
    batchNumber: { type: String, trim: true },
    unitCost: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    storageLocation: { type: String, trim: true },
    targetDepartmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    targetStorageLocation: { type: String, trim: true },
  },
  { timestamps: true },
);

stockMovementSchema.index({ movementId: "text", reference: "text", reason: "text" });

export default mongoose.model("StockMovement", stockMovementSchema);
