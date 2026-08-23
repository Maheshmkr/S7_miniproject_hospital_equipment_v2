import type { ModuleRecord, Tone } from "@/lib/modules";
import type {
  ApiDepartment,
  ApiPurchaseOrder,
  ApiPurchaseOrderInput,
  ApiPurchaseOrderStatus,
  ApiUser,
  ApiVendor,
} from "./types";

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PENDING_APPROVAL: { label: "Pending approval", tone: "warning" },
  APPROVED: { label: "Approved", tone: "primary" },
  REJECTED: { label: "Rejected", tone: "danger" },
  ORDERED: { label: "Ordered", tone: "violet" },
  PARTIALLY_RECEIVED: { label: "Partially received", tone: "warning" },
  RECEIVED: { label: "Received", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

/** Progress along the procurement pipeline, used for the record score meter. */
const PROGRESS: Record<string, number> = {
  DRAFT: 10,
  PENDING_APPROVAL: 30,
  APPROVED: 55,
  ORDERED: 75,
  PARTIALLY_RECEIVED: 88,
  RECEIVED: 100,
  REJECTED: 0,
  CANCELLED: 0,
};

export const PO_STATUS_LABELS = STATUS_META;

const name = (v: unknown, fallback = "—") =>
  typeof v === "object" && v
    ? (v as ApiVendor | ApiUser | ApiDepartment as { name?: string }).name || fallback
    : fallback;

const displayDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const toISO = (v?: string) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export const formatMoney = (amount: number, currency = "USD") =>
  `${currency} ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** ApiPurchaseOrder -> the ModuleRecord shape the workflow pages render. */
export function toPurchaseOrderRecord(po: ApiPurchaseOrder): ModuleRecord {
  const meta = STATUS_META[po.status] ?? { label: po.status, tone: "neutral" as Tone };
  const vendor = name(po.vendorId);
  const department = name(po.departmentId);
  const total = formatMoney(po.totalAmount, po.currency);
  const itemLines = po.items.map(
    (i, idx) =>
      `${idx + 1}. ${i.description} — ${i.quantity} × ${formatMoney(i.unitPrice, po.currency)} = ${formatMoney(i.total ?? 0, po.currency)}`,
  );

  return {
    id: po.purchaseOrderId,
    title: po.title || `${po.items[0]?.description ?? "Purchase order"}`,
    subtitle: `${vendor} · ${department} · ${po.items.length} item(s)`,
    status: meta.label,
    tone: meta.tone,
    score: PROGRESS[po.status] ?? 0,
    scoreLabel: "Progress",
    cells: [
      po.poNumber || po.purchaseOrderId,
      vendor,
      department,
      total,
      meta.label,
      displayDate(po.orderDate),
    ],
    meta: [
      { label: "PO number", value: po.poNumber || po.purchaseOrderId },
      { label: "Vendor", value: vendor },
      { label: "Department", value: department },
      { label: "Requested by", value: name(po.requestedBy) },
      { label: "Approved by", value: name(po.approvedBy) },
      { label: "Priority", value: po.priority },
      { label: "Order date", value: displayDate(po.orderDate) },
      { label: "Expected delivery", value: displayDate(po.expectedDeliveryDate) },
      { label: "Delivered", value: displayDate(po.deliveryDate) },
      { label: "Items", value: itemLines.join("\n") || "—" },
      { label: "Subtotal", value: formatMoney(po.subtotal, po.currency) },
      { label: "Discount", value: formatMoney(po.discount, po.currency) },
      { label: "Tax", value: formatMoney(po.tax, po.currency) },
      { label: "Shipping", value: formatMoney(po.shippingCost, po.currency) },
      { label: "Total", value: total },
      { label: "Payment terms", value: po.paymentTerms || "—" },
      { label: "Delivery address", value: po.deliveryAddress || "—" },
      { label: "Notes", value: po.notes || "—" },
      ...(po.rejectionReason ? [{ label: "Rejection reason", value: po.rejectionReason }] : []),
    ],
    values: {
      title: po.title ?? "",
      vendorId: typeof po.vendorId === "object" ? po.vendorId.vendorId : String(po.vendorId ?? ""),
      departmentId:
        typeof po.departmentId === "object" && po.departmentId
          ? po.departmentId.code
          : String(po.departmentId ?? ""),
      priority: po.priority,
      orderDate: toISO(po.orderDate),
      expectedDeliveryDate: toISO(po.expectedDeliveryDate),
      currency: po.currency,
      shippingCost: String(po.shippingCost ?? 0),
      paymentTerms: po.paymentTerms ?? "",
      deliveryAddress: po.deliveryAddress ?? "",
      notes: po.notes ?? "",
      itemDescription: po.items[0]?.description ?? "",
      itemCode: po.items[0]?.itemCode ?? "",
      quantity: String(po.items[0]?.quantity ?? 1),
      unitPrice: String(po.items[0]?.unitPrice ?? 0),
      taxRate: String(po.items[0]?.taxRate ?? 0),
      discountRate: String(po.items[0]?.discountRate ?? 0),
      specification: po.items[0]?.specification ?? "",
    },
    timeline: [
      {
        when: displayDate(po.updatedAt),
        who: "System",
        what: `status is ${meta.label.toLowerCase()}`,
        tone: meta.tone,
      },
      ...(po.approvedAt
        ? [
            {
              when: displayDate(po.approvedAt),
              who: name(po.approvedBy, "Administrator"),
              what: "approved this purchase order",
              tone: "success" as Tone,
            },
          ]
        : []),
      ...(po.rejectedAt
        ? [
            {
              when: displayDate(po.rejectedAt),
              who: name(po.rejectedBy, "Administrator"),
              what: "rejected this purchase order",
              tone: "danger" as Tone,
            },
          ]
        : []),
      {
        when: displayDate(po.createdAt),
        who: name(po.requestedBy, "Requester"),
        what: `raised ${po.purchaseOrderId}`,
        tone: "neutral",
      },
    ],
  };
}

const num = (v?: string, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/**
 * Form values -> API payload. The single-line create form maps onto the
 * backend's embedded item array; the backend recalculates every money field.
 */
export function toPurchaseOrderPayload(values: Record<string, string>): ApiPurchaseOrderInput {
  return {
    vendorId: values["vendorId"] ?? "",
    ...(values["departmentId"] ? { departmentId: values["departmentId"] } : {}),
    ...(values["title"] ? { title: values["title"] } : {}),
    ...(values["orderDate"] ? { orderDate: values["orderDate"] } : {}),
    ...(values["expectedDeliveryDate"]
      ? { expectedDeliveryDate: values["expectedDeliveryDate"] }
      : {}),
    priority: (values["priority"] || "MEDIUM").toUpperCase(),
    items: [
      {
        description: values["itemDescription"] ?? "",
        ...(values["itemCode"] ? { itemCode: values["itemCode"] } : {}),
        quantity: num(values["quantity"], 1),
        unitPrice: num(values["unitPrice"]),
        taxRate: num(values["taxRate"]),
        discountRate: num(values["discountRate"]),
        ...(values["specification"] ? { specification: values["specification"] } : {}),
      },
    ],
    shippingCost: num(values["shippingCost"]),
    currency: values["currency"] || "USD",
    ...(values["paymentTerms"] ? { paymentTerms: values["paymentTerms"] } : {}),
    ...(values["deliveryAddress"] ? { deliveryAddress: values["deliveryAddress"] } : {}),
    ...(values["notes"] ? { notes: values["notes"] } : {}),
  };
}

export const purchaseOrderStatusLabel = (status: ApiPurchaseOrderStatus) =>
  STATUS_META[status]?.label ?? status;
