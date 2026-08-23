import type { ModuleRecord, Tone } from "@/lib/modules";
import type { ApiDepartment, ApiInventoryItem, ApiStockMovement, ApiVendor } from "./types";

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  IN_STOCK: { label: "In Stock", tone: "success" },
  LOW_STOCK: { label: "Low Stock", tone: "warning" },
  OUT_OF_STOCK: { label: "Out of Stock", tone: "danger" },
  EXPIRED: { label: "Expired", tone: "danger" },
  DISCONTINUED: { label: "Discontinued", tone: "neutral" },
};

export const INVENTORY_STATUS_LABELS = STATUS_META;

const name = (v: unknown, fallback = "—") =>
  typeof v === "object" && v
    ? (v as ApiVendor | ApiDepartment as { name?: string }).name || fallback
    : fallback;

const displayDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

const toISO = (v?: string) => (v ? new Date(v).toISOString().slice(0, 10) : "");

export const formatMoney = (amount: number, currency = "USD") =>
  `${currency} ${Number(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function toInventoryRecord(
  item: ApiInventoryItem,
  movements: ApiStockMovement[] = [],
): ModuleRecord {
  const meta = STATUS_META[item.status] ?? { label: item.status, tone: "neutral" as Tone };
  const vendor = name(item.vendorId);
  const department = name(item.departmentId);
  const totalVal = formatMoney(item.totalValue);

  const stockPercent = item.reorderLevel
    ? Math.min(100, Math.round((item.availableQuantity / (item.reorderLevel * 2)) * 100))
    : item.quantity > 0
      ? 100
      : 0;

  const movementTimeline = movements.map((m) => ({
    when: displayDate(m.createdAt),
    who:
      typeof m.performedBy === "object" && m.performedBy
        ? (m.performedBy as { name: string }).name
        : "User",
    what: `${m.type}: ${m.quantity} ${item.unit || "units"} (${m.reason || m.reference || "Stock update"})`,
    tone: (m.type === "RECEIPT" || m.type === "RETURN"
      ? "success"
      : m.type === "ISSUE"
        ? "warning"
        : "primary") as Tone,
  }));

  return {
    id: item.itemId,
    title: item.name,
    subtitle: `${item.category} · ${item.availableQuantity} ${item.unit} available · ${item.storageLocation || "Central Stores"}`,
    status: meta.label,
    tone: meta.tone,
    score: stockPercent,
    scoreLabel: "Stock Level",
    cells: [
      item.itemId,
      item.name,
      item.category,
      `${item.availableQuantity} / ${item.quantity} ${item.unit}`,
      totalVal,
      meta.label,
    ],
    meta: [
      { label: "Item ID / SKU", value: `${item.itemId}${item.sku ? ` (${item.sku})` : ""}` },
      { label: "Category", value: item.category },
      { label: "Item type", value: item.itemType || "Spare Part" },
      { label: "Manufacturer", value: item.manufacturer || "—" },
      { label: "Vendor", value: vendor },
      { label: "Department", value: department },
      { label: "Total on hand", value: `${item.quantity} ${item.unit}` },
      { label: "Available quantity", value: `${item.availableQuantity} ${item.unit}` },
      { label: "Reserved quantity", value: `${item.reservedQuantity} ${item.unit}` },
      { label: "Minimum stock level", value: String(item.minStockLevel ?? 5) },
      { label: "Reorder level", value: String(item.reorderLevel ?? 10) },
      { label: "Maximum stock level", value: String(item.maxStockLevel ?? 100) },
      { label: "Unit cost", value: formatMoney(item.unitCost) },
      { label: "Total stock value", value: totalVal },
      { label: "Storage location", value: item.storageLocation || "—" },
      { label: "Batch number", value: item.batchNumber || "—" },
      { label: "Serial number", value: item.serialNumber || "—" },
      { label: "Expiry date", value: displayDate(item.expiryDate) },
      { label: "Description", value: item.description || "—" },
    ],
    values: {
      name: item.name,
      itemId: item.itemId,
      sku: item.sku ?? "",
      category: item.category,
      itemType: item.itemType ?? "SPARE_PART",
      description: item.description ?? "",
      manufacturer: item.manufacturer ?? "",
      vendorId:
        typeof item.vendorId === "object" ? item.vendorId?.name : String(item.vendorId ?? ""),
      unit: item.unit ?? "PIECE",
      quantity: String(item.quantity ?? 0),
      minStockLevel: String(item.minStockLevel ?? 5),
      maxStockLevel: String(item.maxStockLevel ?? 100),
      reorderLevel: String(item.reorderLevel ?? 10),
      unitCost: String(item.unitCost ?? 0),
      storageLocation: item.storageLocation ?? "",
      departmentId:
        typeof item.departmentId === "object"
          ? item.departmentId?.name
          : String(item.departmentId ?? ""),
      batchNumber: item.batchNumber ?? "",
      serialNumber: item.serialNumber ?? "",
      expiryDate: toISO(item.expiryDate),
      status: item.status,
    },
    timeline: movementTimeline.length
      ? movementTimeline
      : [
          {
            when: displayDate(item.createdAt),
            who: "System",
            what: `Registered ${item.name} in inventory`,
            tone: "primary",
          },
        ],
  };
}
