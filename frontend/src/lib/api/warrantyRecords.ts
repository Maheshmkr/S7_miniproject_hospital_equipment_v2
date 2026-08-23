import type { ModuleRecord, Tone } from "@/lib/modules";
import type { ApiDepartment, ApiEquipment, ApiWarranty } from "./types";

const STATUS_META: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Active", tone: "success" },
  EXPIRING: { label: "Expiring", tone: "warning" },
  EXPIRED: { label: "Expired", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

const displayDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
const dateOnly = (v?: string) => (v ? v.slice(0, 10) : "");

export const equipmentLabel = (e: ApiWarranty["equipmentId"]): string =>
  typeof e === "object" && e
    ? `${(e as ApiEquipment).equipmentId} · ${(e as ApiEquipment).name}`
    : "Unassigned";

export const equipmentCode = (e: ApiWarranty["equipmentId"]): string =>
  typeof e === "object" && e ? (e as ApiEquipment).equipmentId : (e ?? "");

export const warrantyDepartment = (d: ApiWarranty["departmentId"]): string =>
  typeof d === "object" && d ? (d as ApiDepartment).name : "—";

/** ApiWarranty -> the ModuleRecord shape the existing Warranty pages render. */
export function toWarrantyRecord(w: ApiWarranty): ModuleRecord {
  const meta = STATUS_META[w.status] ?? { label: w.status, tone: "neutral" as Tone };
  const days = w.daysRemaining ?? 0;
  const type = w.kind === "AMC" ? "Comprehensive AMC" : "Warranty";
  const coveragePct = days <= 0 ? 0 : Math.max(5, Math.min(100, Math.round((days / 365) * 100)));
  return {
    id: w.warrantyId || w._id,
    title: w.vendor || w.warrantyId,
    subtitle: `${type} · ${equipmentLabel(w.equipmentId)}`,
    status: meta.label,
    tone: meta.tone,
    score: coveragePct,
    scoreLabel: "Coverage",
    cells: [
      w.warrantyId,
      w.vendor || "—",
      type,
      equipmentCode(w.equipmentId) || "—",
      displayDate(w.endDate),
      w.value || "—",
    ],
    meta: [
      { label: "Contract type", value: type },
      { label: "Covered asset", value: equipmentLabel(w.equipmentId) },
      { label: "Department", value: warrantyDepartment(w.departmentId) },
      { label: "Contract number", value: w.contractNumber || "—" },
      { label: "Contract value", value: w.value || "—" },
      { label: "Starts", value: displayDate(w.startDate) },
      { label: "Expires", value: displayDate(w.endDate) },
      { label: "Days remaining", value: days === null ? "—" : `${days} days` },
      { label: "Coverage", value: w.coverage || "—" },
    ],
    values: {
      vendor: w.vendor ?? "",
      type,
      assets: "1",
      value: w.value ?? "",
      start: dateOnly(w.startDate),
      expires: dateOnly(w.endDate),
      terms: w.terms ?? w.coverage ?? "",
    },
    timeline: [
      {
        when: displayDate(w.endDate),
        who: "System",
        what: "contract expiry date",
        tone: meta.tone,
      },
      {
        when: displayDate(w.startDate),
        who: w.vendor || "Vendor",
        what: "coverage started",
        tone: "success",
      },
    ],
  };
}

/** Form values from the existing Warranty form -> API payload. */
export function toWarrantyPayload(values: Record<string, string>, equipmentId?: string) {
  const kind: "WARRANTY" | "AMC" = /amc/i.test(values["type"] ?? "") ? "AMC" : "WARRANTY";
  return {
    ...(equipmentId ? { equipmentId } : {}),
    kind,
    vendor: values["vendor"] ?? "",
    contractType: values["type"] ?? "",
    value: values["value"] ?? "",
    startDate: values["start"] ?? "",
    endDate: values["expires"] ?? "",
    terms: values["terms"] ?? "",
    coverage: values["terms"] ?? "",
  };
}
