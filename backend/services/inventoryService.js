import InventoryItem from "../models/InventoryItem.js";
import StockMovement from "../models/StockMovement.js";
import { ApiError } from "./apiError.js";
import { logAudit } from "./auditService.js";
import { nextCode } from "./lifecycleService.js";

/** Compute stock status based on quantities and expiry date. */
export function computeItemStatus(item) {
  if (item.status === "DISCONTINUED") return "DISCONTINUED";
  if (item.expiryDate && new Date(item.expiryDate) < new Date()) {
    return "EXPIRED";
  }
  if (item.quantity <= 0) {
    return "OUT_OF_STOCK";
  }
  const threshold = item.reorderLevel !== undefined ? item.reorderLevel : item.minStockLevel ?? 5;
  if (item.quantity <= threshold) {
    return "LOW_STOCK";
  }
  return "IN_STOCK";
}

/** Record a stock movement, update item balances, save, and log audit. */
export async function recordStockMovement({
  item,
  type,
  quantity,
  user,
  reference,
  reason,
  notes,
  batchNumber,
  unitCost,
  relatedEquipmentId,
  relatedPurchaseOrderId,
  relatedWorkOrderId,
  departmentId,
  storageLocation,
  targetDepartmentId,
  targetStorageLocation,
}) {
  const qty = Number(quantity);
  if (Number.isNaN(qty) || qty <= 0) {
    throw new ApiError(400, "Movement quantity must be a positive number");
  }

  const previousQty = item.quantity;
  let newQty = previousQty;
  let newAvail = item.availableQuantity;

  if (type === "RECEIPT" || type === "RETURN") {
    newQty = previousQty + qty;
    newAvail = item.availableQuantity + qty;
  } else if (type === "ISSUE") {
    if (item.availableQuantity < qty) {
      throw new ApiError(
        422,
        `Cannot issue ${qty} units; only ${item.availableQuantity} available in stock`,
      );
    }
    newQty = previousQty - qty;
    newAvail = item.availableQuantity - qty;
  } else if (type === "ADJUSTMENT") {
    newQty = qty;
    const diff = newQty - previousQty;
    newAvail = item.availableQuantity + diff;
    if (newAvail < 0) {
      throw new ApiError(422, `Adjusted stock would result in negative available quantity (${newAvail})`);
    }
  } else if (type === "TRANSFER") {
    if (item.availableQuantity < qty) {
      throw new ApiError(
        422,
        `Cannot transfer ${qty} units; only ${item.availableQuantity} available in stock`,
      );
    }
    // If full transfer to another department/location
    if (targetDepartmentId) item.departmentId = targetDepartmentId;
    if (targetStorageLocation) item.storageLocation = targetStorageLocation;
  }

  if (newQty < 0 || newAvail < 0) {
    throw new ApiError(422, "Stock quantities cannot become negative");
  }

  const cost = unitCost !== undefined && unitCost !== null && unitCost !== "" ? Number(unitCost) : item.unitCost;
  if (!Number.isNaN(cost) && cost >= 0) {
    item.unitCost = cost;
  }
  item.quantity = newQty;
  item.availableQuantity = newAvail;
  item.totalValue = item.quantity * (item.unitCost || 0);
  item.status = computeItemStatus(item);
  item.updatedBy = user?._id;

  if (batchNumber) item.batchNumber = batchNumber;
  if (storageLocation) item.storageLocation = storageLocation;

  await item.save();

  const movementId = await nextCode(StockMovement, "movementId", "MOV-", 4);
  const movement = await StockMovement.create({
    movementId,
    itemId: item._id,
    type,
    quantity: type === "ADJUSTMENT" ? Math.abs(newQty - previousQty) : qty,
    previousQuantity: previousQty,
    newQuantity: newQty,
    reference,
    relatedEquipmentId,
    relatedPurchaseOrderId,
    relatedWorkOrderId,
    performedBy: user?._id,
    departmentId: departmentId || item.departmentId,
    reason,
    notes,
    batchNumber: batchNumber || item.batchNumber,
    unitCost: item.unitCost,
    totalCost: (type === "ADJUSTMENT" ? Math.abs(newQty - previousQty) : qty) * (item.unitCost || 0),
    storageLocation: storageLocation || item.storageLocation,
    targetDepartmentId,
    targetStorageLocation,
  });

  await logAudit({
    user,
    action: `STOCK_${type}`,
    module: "Inventory",
    recordId: item.itemId,
    previousStatus: String(previousQty),
    newStatus: String(newQty),
    description: `Stock ${type} of ${qty} for ${item.itemId} (${item.name}). Reason: ${reason || reference || "N/A"}`,
  });

  return { item, movement };
}
