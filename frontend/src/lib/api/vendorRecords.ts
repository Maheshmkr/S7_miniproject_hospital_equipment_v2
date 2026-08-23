import type { ModuleRecord, Tone } from "@/lib/modules";
import type { ApiVendor, ApiVendorCategory, ApiVendorStatus } from "./types";

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
  SUSPENDED: { label: "Suspended", tone: "danger" },
};

export const VENDOR_CATEGORY_LABELS: Record<ApiVendorCategory, string> = {
  EQUIPMENT_SUPPLIER: "Equipment Supplier",
  MANUFACTURER: "Manufacturer",
  SERVICE_PROVIDER: "Service Provider",
  CALIBRATION_PROVIDER: "Calibration Provider",
  MAINTENANCE_PROVIDER: "Maintenance Provider",
  OTHER: "Other",
};

const labelToCategory = (label: string): ApiVendorCategory => {
  const entry = (Object.entries(VENDOR_CATEGORY_LABELS) as [ApiVendorCategory, string][]).find(
    ([, v]) => v.toLowerCase() === label.trim().toLowerCase(),
  );
  return entry ? entry[0] : "OTHER";
};

const labelToStatus = (label: string): ApiVendorStatus => {
  const value = label.trim().toUpperCase();
  return value === "INACTIVE" || value === "SUSPENDED" ? value : "ACTIVE";
};

const displayDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

/** ApiVendor -> the ModuleRecord shape the workflow pages render. */
export function toVendorRecord(v: ApiVendor, contracts = 0, assets = 0): ModuleRecord {
  const meta = STATUS_META[v.status] ?? { label: v.status, tone: "neutral" as Tone };
  const category = VENDOR_CATEGORY_LABELS[v.category] ?? v.category;
  const location = [v.city, v.state].filter(Boolean).join(", ") || "—";
  return {
    id: v.vendorId || v._id,
    title: v.name,
    subtitle: `${category} · ${location}`,
    status: meta.label,
    tone: meta.tone,
    score: Math.round(((v.rating ?? 0) / 5) * 100),
    scoreLabel: "Rating",
    cells: [v.vendorId, v.name, category, location, meta.label, v.contactPerson || "—"],
    meta: [
      { label: "Vendor code", value: v.vendorId },
      { label: "Legal name", value: v.legalName || v.name },
      { label: "Category", value: category },
      { label: "Specialisation", value: v.specialization || "—" },
      { label: "Contact person", value: v.contactPerson || "—" },
      { label: "Email", value: v.email || "—" },
      { label: "Phone", value: v.phone || "—" },
      { label: "Website", value: v.website || "—" },
      {
        label: "Address",
        value:
          [v.address, v.city, v.state, v.country, v.postalCode].filter(Boolean).join(", ") || "—",
      },
      { label: "Tax ID", value: v.taxId || "—" },
      { label: "Rating", value: v.rating ? `${v.rating}/5` : "—" },
      { label: "Linked contracts", value: String(contracts) },
      { label: "Linked assets", value: String(assets) },
    ],
    values: {
      name: v.name,
      legalName: v.legalName ?? "",
      category,
      status: meta.label,
      contactPerson: v.contactPerson ?? "",
      email: v.email ?? "",
      phone: v.phone ?? "",
      website: v.website ?? "",
      address: v.address ?? "",
      city: v.city ?? "",
      state: v.state ?? "",
      country: v.country ?? "",
      postalCode: v.postalCode ?? "",
      taxId: v.taxId ?? "",
      specialization: v.specialization ?? "",
      rating: v.rating ? String(v.rating) : "",
      notes: v.notes ?? "",
    },
    timeline: [
      {
        when: displayDate(v.updatedAt),
        who: "System",
        what: "vendor record last updated",
        tone: meta.tone,
      },
      {
        when: displayDate(v.createdAt),
        who: "Administrator",
        what: "vendor added to the register",
        tone: "success",
      },
    ],
  };
}

/** Form values from the Vendor form -> API payload. */
export function toVendorPayload(
  values: Record<string, string>,
): Partial<ApiVendor> & { name: string } {
  return {
    name: values["name"] ?? "",
    legalName: values["legalName"] ?? "",
    category: labelToCategory(values["category"] ?? ""),
    status: labelToStatus(values["status"] ?? "Active"),
    contactPerson: values["contactPerson"] ?? "",
    email: values["email"] ?? "",
    phone: values["phone"] ?? "",
    website: values["website"] ?? "",
    address: values["address"] ?? "",
    city: values["city"] ?? "",
    state: values["state"] ?? "",
    country: values["country"] ?? "",
    postalCode: values["postalCode"] ?? "",
    taxId: values["taxId"] ?? "",
    specialization: values["specialization"] ?? "",
    ...(values["rating"] ? { rating: Number(values["rating"]) } : {}),
    notes: values["notes"] ?? "",
  };
}
