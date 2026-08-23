import type { ModuleRecord, Tone } from "@/lib/modules";
import type { ApiDepartment, ApiEquipment, ApiEquipmentStatus } from "./types";

/** Human labels + tones for the backend equipment lifecycle statuses. */
const STATUS_META: Record<ApiEquipmentStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Operational", tone: "success" },
  OPERATIONAL: { label: "Operational", tone: "success" },
  UNDER_BREAKDOWN: { label: "Critical", tone: "danger" },
  UNDER_MAINTENANCE: { label: "Maintenance", tone: "warning" },
  AWAITING_PARTS: { label: "Awaiting parts", tone: "warning" },
  MAINTENANCE_COMPLETED: { label: "Maintenance completed", tone: "primary" },
  UNDER_VERIFICATION: { label: "Under verification", tone: "primary" },
  OUT_OF_SERVICE: { label: "Out of service", tone: "danger" },
  RETIRED: { label: "Retired", tone: "neutral" },
};

export const departmentName = (dept: ApiEquipment["departmentId"]): string =>
  typeof dept === "object" && dept ? (dept as ApiDepartment).name : "Unassigned";

export const departmentId = (dept: ApiEquipment["departmentId"]): string =>
  typeof dept === "object" && dept ? (dept as ApiDepartment)._id : (dept ?? "");

const dateOnly = (v?: string) => (v ? v.slice(0, 10) : "");
const displayDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

/** ApiEquipment -> the ModuleRecord shape the existing Equipment pages render. */
export function toEquipmentRecord(e: ApiEquipment): ModuleRecord {
  const meta = STATUS_META[e.status] ?? { label: e.status, tone: "neutral" as Tone };
  const dept = departmentName(e.departmentId);
  return {
    id: e.equipmentId || e._id,
    title: e.name,
    subtitle: `${dept} · ${e.manufacturer || e.vendor || "—"}`,
    status: meta.label,
    tone: meta.tone,
    score: e.healthScore ?? 100,
    scoreLabel: "Health",
    cells: [e.equipmentId, e.name, e.category, dept, meta.label, `${e.healthScore ?? 100}%`],
    meta: [
      { label: "Category", value: e.category },
      { label: "Department", value: dept },
      { label: "Vendor", value: e.vendor || e.manufacturer || "—" },
      { label: "Model", value: e.model || "—" },
      { label: "Serial number", value: e.serialNumber || "—" },
      { label: "Location", value: e.location || "—" },
      { label: "Accountable owner", value: e.owner || "—" },
      { label: "Installed on", value: displayDate(e.installationDate) },
      { label: "Warranty until", value: displayDate(e.warrantyExpiry) },
      { label: "Acquisition cost", value: e.cost || "—" },
      { label: "Software version", value: e.softwareVersion || "—" },
      { label: "Risk class", value: e.riskClass || "—" },
      { label: "Criticality", value: e.criticality },
      { label: "Next service due", value: displayDate(e.nextPreventiveDate) },
    ],
    values: {
      name: e.name,
      tag: e.equipmentId,
      model: e.model ?? "",
      serial: e.serialNumber ?? "",
      category: e.category,
      dept,
      vendor: e.vendor ?? e.manufacturer ?? "",
      location: e.location ?? "",
      owner: e.owner ?? "",
      cost: e.cost ?? "",
      power: e.power ?? "",
      software: e.softwareVersion ?? "",
      riskClass: e.riskClass ?? "",
      installed: dateOnly(e.installationDate),
      warranty: dateOnly(e.warrantyExpiry),
      nextService: dateOnly(e.nextPreventiveDate),
      notes: e.description ?? "",
    },
    timeline: [
      {
        when: displayDate(e.updatedAt),
        who: "System",
        what: "record last updated",
        tone: "primary",
      },
      {
        when: displayDate(e.installationDate),
        who: "Biomedical team",
        what: "asset installed on site",
        tone: "success",
      },
      {
        when: displayDate(e.createdAt),
        who: "Administrator",
        what: `${e.equipmentId} added to the register`,
        tone: "neutral",
      },
    ],
  };
}

/** Form field values (existing Equipment form) -> API payload. */
export function toEquipmentPayload(
  values: Record<string, string>,
  departmentsByName: Record<string, string> = {},
): Partial<ApiEquipment> {
  const payload: Record<string, unknown> = {
    name: values["name"]?.trim(),
    category: values["category"],
    model: values["model"],
    serialNumber: values["serial"]?.trim() || undefined,
    vendor: values["vendor"],
    manufacturer: values["vendor"],
    location: values["location"],
    owner: values["owner"],
    cost: values["cost"],
    power: values["power"],
    softwareVersion: values["software"],
    riskClass: values["riskClass"],
    installationDate: values["installed"] || undefined,
    warrantyExpiry: values["warranty"] || undefined,
    nextPreventiveDate: values["nextService"] || undefined,
    description: values["notes"],
  };
  if (values["tag"]?.trim()) payload["equipmentId"] = values["tag"].trim();
  const deptId = departmentsByName[values["dept"] ?? ""];
  if (deptId) payload["departmentId"] = deptId;
  return payload as Partial<ApiEquipment>;
}
