import type { ModuleRecord, Tone } from "@/lib/modules";
import type {
  ApiComplaint,
  ApiComplaintStatus,
  ApiDepartment,
  ApiEquipment,
  ApiUser,
} from "./types";

/** Human labels + tones for the backend complaint lifecycle statuses. */
const STATUS_META: Record<ApiComplaintStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Open", tone: "primary" },
  UNDER_REVIEW: { label: "Triage", tone: "warning" },
  ASSIGNED: { label: "Assigned", tone: "primary" },
  INVESTIGATION: { label: "Investigation", tone: "violet" },
  MAINTENANCE_IN_PROGRESS: { label: "In Progress", tone: "primary" },
  AWAITING_PARTS: { label: "Awaiting parts", tone: "warning" },
  TESTING: { label: "Testing", tone: "violet" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const statusLabel = (status: ApiComplaintStatus) => STATUS_META[status]?.label ?? status;

const titleCase = (v?: string) => (v ? v.charAt(0) + v.slice(1).toLowerCase() : "—");

const equipmentName = (eq: ApiComplaint["equipmentId"]) =>
  typeof eq === "object" && eq ? (eq as ApiEquipment).name : "—";
const equipmentCode = (eq: ApiComplaint["equipmentId"]) =>
  typeof eq === "object" && eq ? (eq as ApiEquipment).equipmentId : String(eq ?? "");
const deptName = (d: ApiComplaint["departmentId"]) =>
  typeof d === "object" && d ? (d as ApiDepartment).name : "Unassigned";
const personName = (u?: string | ApiUser) => (typeof u === "object" && u ? u.name : "Unassigned");

const age = (iso?: string) => {
  if (!iso) return "—";
  const hours = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3_600_000));
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
};

/** ApiComplaint -> the ModuleRecord shape the existing Complaint pages render. */
export function toComplaintRecord(c: ApiComplaint): ModuleRecord {
  const meta = STATUS_META[c.status] ?? { label: c.status, tone: "neutral" as Tone };
  const dept = deptName(c.departmentId);
  const assignee = personName(c.assignedEngineerId);
  const priority = titleCase(c.priority);
  const equipment = equipmentName(c.equipmentId);

  return {
    id: c.complaintId || c._id,
    title: c.title,
    subtitle: `${equipment} · ${dept}`,
    status: meta.label,
    tone: meta.tone,
    score:
      c.priority === "CRITICAL"
        ? 96
        : c.priority === "HIGH"
          ? 78
          : c.priority === "MEDIUM"
            ? 52
            : 28,
    scoreLabel: "SLA used",
    cells: [c.complaintId, c.title, dept, priority, meta.label, assignee],
    meta: [
      { label: "Priority", value: priority },
      { label: "Status", value: meta.label },
      { label: "Assignee", value: assignee },
      { label: "Department", value: dept },
      { label: "Equipment", value: `${equipmentCode(c.equipmentId)} · ${equipment}` },
      { label: "Reported by", value: personName(c.reportedBy) },
      { label: "Age", value: age(c.createdAt) },
      {
        label: "Work order",
        value:
          typeof c.workOrderId === "object" && c.workOrderId
            ? `${c.workOrderId.workOrderId} · ${c.workOrderId.title}`
            : c.workOrderId
              ? String(c.workOrderId)
              : "Not raised yet",
      },
      { label: "Resolution", value: c.resolution || "—" },
    ],
    values: {
      title: c.title,
      equipment,
      dept,
      priority,
      assignee,
      description: c.description,
      resolution: c.resolution ?? "",
    },
    timeline: [
      {
        when: new Date(c.createdAt).toLocaleString("en-GB"),
        who: personName(c.reportedBy),
        what: `${c.complaintId} raised`,
        tone: "primary" as Tone,
      },
      ...(c.assignedEngineerId
        ? [{ when: "—", who: assignee, what: "Assigned to engineer", tone: "violet" as Tone }]
        : []),
      ...(c.resolvedAt
        ? [
            {
              when: new Date(c.resolvedAt).toLocaleString("en-GB"),
              who: assignee,
              what: c.resolution || "Resolved",
              tone: "success" as Tone,
            },
          ]
        : []),
    ],
  } as ModuleRecord;
}

export type ComplaintFormPayload = {
  title: string;
  description: string;
  priority: string;
  equipmentId?: string;
  departmentId?: string;
  engineerId?: string;
};

/** Form values (names) -> API payload (ids + enum values). */
export function toComplaintPayload(
  values: Record<string, string>,
  lookups: {
    equipmentByName: Record<string, string>;
    departmentsByName: Record<string, string>;
    engineersByName: Record<string, string>;
  },
): ComplaintFormPayload {
  const equipmentId =
    lookups.equipmentByName[values["equipment"] ?? ""] ||
    lookups.equipmentByName[values["equipmentId"] ?? ""] ||
    values["equipmentId"] ||
    values["equipment"];
  const departmentId =
    lookups.departmentsByName[values["dept"] ?? ""] ||
    lookups.departmentsByName[values["department"] ?? ""] ||
    lookups.departmentsByName[values["departmentId"] ?? ""] ||
    values["departmentId"] ||
    values["dept"] ||
    values["department"];
  let engineerId =
    lookups.engineersByName[values["assignee"] ?? ""] ||
    lookups.engineersByName[values["engineer"] ?? ""] ||
    lookups.engineersByName[values["engineerId"] ?? ""] ||
    lookups.engineersByName[values["assignedEngineerId"] ?? ""] ||
    values["engineerId"] ||
    values["assignedEngineerId"] ||
    values["assignee"] ||
    values["engineer"];

  if (
    engineerId === "Unassigned" ||
    engineerId === "unassigned" ||
    engineerId === "none" ||
    engineerId === "None"
  ) {
    engineerId = undefined;
  }

  return {
    title: values["title"] ?? "",
    description: values["description"] ?? "",
    priority: (values["priority"] ?? "MEDIUM").toUpperCase(),
    ...(equipmentId ? { equipmentId } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(engineerId ? { engineerId } : {}),
  };
}
