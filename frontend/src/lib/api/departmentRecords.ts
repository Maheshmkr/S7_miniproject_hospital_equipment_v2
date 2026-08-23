import type { ModuleRecord, Tone } from "@/lib/modules";
import type { ApiDepartment } from "./types";

const displayDate = (v?: string) =>
  v
    ? new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Recently";

export function toDepartmentRecord(
  d: ApiDepartment,
  assetsCount = 0,
  staffCount = 0,
  openComplaints = 0,
  uptime = 99.2,
  spend = 38,
): ModuleRecord {
  const score = Math.min(100, Math.max(70, Math.round(uptime - openComplaints * 0.8)));
  const status = score >= 92 ? "Excellent" : score >= 86 ? "Healthy" : "Needs attention";
  const tone: Tone = score >= 92 ? "success" : score >= 86 ? "primary" : "warning";
  const location = [d.building, d.floor].filter(Boolean).join(" · ") || "Main Facility";

  return {
    id: d.code || d._id,
    title: d.name,
    subtitle: `${location} · Code: ${d.code}`,
    status,
    tone,
    score,
    scoreLabel: "Score",
    cells: [
      d.name,
      String(assetsCount),
      String(staffCount),
      `${uptime}%`,
      String(openComplaints),
      `$${spend}K`,
    ],
    meta: [
      { label: "Department code", value: d.code },
      { label: "Department name", value: d.name },
      { label: "Building", value: d.building || "—" },
      { label: "Floor", value: d.floor || "—" },
      { label: "Head of department", value: d.headName || "—" },
      { label: "Active status", value: d.active !== false ? "Active" : "Inactive" },
      { label: "Assets registered", value: String(assetsCount) },
      { label: "Staff headcount", value: String(staffCount) },
    ],
    values: {
      name: d.name,
      code: d.code,
      head: d.headName ?? "",
      building: d.building ?? "",
      floor: d.floor ?? "",
      wing: d.building ?? "",
      staff: String(staffCount || ""),
    },
    timeline: [
      {
        when: "Today · Verified",
        who: "System",
        what: `operational metrics refreshed for ${d.name}`,
        tone: "primary",
      },
      {
        when: "Commissioned",
        who: "Administrator",
        what: `registered ${d.name} (${d.code}) in the clinical estate`,
        tone: "success",
      },
    ],
  };
}

export function toDepartmentPayload(values: Record<string, string>): Partial<ApiDepartment> {
  const code = (values["code"] || values["name"]?.slice(0, 4) || "").trim().toUpperCase();
  return {
    code,
    name: values["name"]?.trim() || "",
    headName: values["head"] || values["headName"] || undefined,
    building: values["building"] || values["wing"] || undefined,
    floor: values["floor"] || undefined,
    active: true,
  };
}
