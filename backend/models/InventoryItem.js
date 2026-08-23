import mongoose from "mongoose";

export const INVENTORY_CATEGORIES = [
  "SPARE_PARTS",
  "CONSUMABLES",
  "REAGENTS",
  "ACCESSORIES",
  "TOOLS",
  "IMPLANTS",
  "OTHER",
];

export const INVENTORY_STATUSES = [
  "IN_STOCK",
  "LOW_STOCK",
  "OUT_OF_STOCK",
  "EXPIRED",
  "DISCONTINUED",
];

export const INVENTORY_UNITS = [
  "PIECE",
  "BOX",
  "PACK",
  "SET",
  "ROLL",
  "LITER",
  "BOTTLE",
  "KIT",
  "METER",
  "UNIT",
];

const inventoryItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true, unique: true, trim: true, index: true },
    sku: { type: String, trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true, default: "SPARE_PARTS" },
    itemType: { type: String, trim: true, default: "SPARE_PART" },
    description: { type: String, trim: true },
    manufacturer: { type: String, trim: true },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", index: true },
    unit: { type: String, trim: true, default: "PIECE" },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    availableQuantity: { type: Number, required: true, min: 0, default: 0 },
    reservedQuantity: { type: Number, required: true, min: 0, default: 0 },
    minStockLevel: { type: Number, min: 0, default: 5 },
    maxStockLevel: { type: Number, min: 0, default: 100 },
    reorderLevel: { type: Number, min: 0, default: 10 },
    unitCost: { type: Number, min: 0, default: 0 },
    totalValue: { type: Number, min: 0, default: 0 },
    storageLocation: { type: String, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: "Department", index: true },
    batchNumber: { type: String, trim: true },
    serialNumber: { type: String, trim: true },
    expiryDate: { type: Date, index: true },
    status: { type: String, enum: INVENTORY_STATUSES, default: "IN_STOCK", index: true },
    relatedEquipmentIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Equipment" }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

inventoryItemSchema.index({ name: "text", description: "text", sku: "text", manufacturer: "text" });

export default mongoose.model("InventoryItem", inventoryItemSchema);
