import { ApiError } from "./apiError.js";
import { PO_LOCKED_STATUSES, PO_TRANSITIONS } from "../models/PurchaseOrder.js";

/** Currency-safe rounding to 2 decimals. */
export const money = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

function positiveNumber(value, label, { max } = {}) {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || Number.isNaN(n)) {
    throw new ApiError(400, `${label} must be a number`);
  }
  if (n < 0) throw new ApiError(400, `${label} cannot be negative`);
  if (max !== undefined && n > max) throw new ApiError(400, `${label} cannot exceed ${max}`);
  return n;
}

/**
 * Normalise + price every line item. Client-sent totals are ignored entirely:
 * line total = qty × unitPrice − discount% + tax% (tax applied after discount).
 */
export function priceItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new ApiError(400, "A purchase order needs at least one item");
  }
  return rawItems.map((item, index) => {
    const label = `Item ${index + 1}`;
    if (!item || !String(item.description || "").trim()) {
      throw new ApiError(400, `${label} needs a description`);
    }
    const quantity = positiveNumber(item.quantity, `${label} quantity`);
    if (quantity <= 0) throw new ApiError(400, `${label} quantity must be greater than zero`);
    const unitPrice = positiveNumber(item.unitPrice, `${label} unit price`);
    const taxRate = positiveNumber(item.taxRate ?? 0, `${label} tax rate`, { max: 100 });
    const discountRate = positiveNumber(item.discountRate ?? 0, `${label} discount rate`, { max: 100 });

    const gross = money(quantity * unitPrice);
    const discountAmount = money((gross * discountRate) / 100);
    const net = money(gross - discountAmount);
    const taxAmount = money((net * taxRate) / 100);

    return {
      description: String(item.description).trim(),
      itemCode: item.itemCode ? String(item.itemCode).trim() : undefined,
      equipmentId: item.equipmentId || undefined,
      quantity,
      unitPrice: money(unitPrice),
      taxRate,
      discountRate,
      discountAmount,
      taxAmount,
      total: money(net + taxAmount),
      specification: item.specification ? String(item.specification).trim() : undefined,
      notes: item.notes ? String(item.notes).trim() : undefined,
      receivedQuantity: 0,
    };
  });
}

/** Roll the priced items plus shipping into the order-level money fields. */
export function computeTotals(items, shippingCost = 0) {
  const shipping = positiveNumber(shippingCost || 0, "Shipping cost");
  const subtotal = money(items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0));
  const discount = money(items.reduce((sum, i) => sum + i.discountAmount, 0));
  const tax = money(items.reduce((sum, i) => sum + i.taxAmount, 0));
  return {
    subtotal,
    discount,
    tax,
    shippingCost: money(shipping),
    totalAmount: money(subtotal - discount + tax + money(shipping)),
  };
}

/** 422 on illegal lifecycle moves — matches the other modules' transition guards. */
export function assertTransition(from, to) {
  const allowed = PO_TRANSITIONS[from] || [];
  if (from === to) return;
  if (!allowed.includes(to)) {
    throw new ApiError(
      422,
      `Cannot move a purchase order from ${from} to ${to}. Allowed: ${allowed.join(", ") || "none"}`,
    );
  }
}

export const isLocked = (status) => PO_LOCKED_STATUSES.includes(status);
