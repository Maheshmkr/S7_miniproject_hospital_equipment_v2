import type { ModuleRecord, Tone } from "@/lib/modules";
import type {
  ApiDepartment,
  ApiEquipment,
  ApiUser,
  ApiWorkOrder,
  ApiWorkOrderStatus,
} from "./types";

/** Human labels + tones for the backend work order lifecycle statuses. */
const STATUS_META: Record<ApiWorkOrderStatus, { label: string; tone: Tone }> = {
  ASSIGNED: { label: "Scheduled", tone: "neutral" },
  IN_PROGRESS: { label: "In Progress", tone: "primary" },
  AWAITING_PARTS: { label: "Awaiting parts", tone: "warning" },
  UNDER_VERIFICATION: { label: "Under verification", tone: "violet" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
};

const PROGRESS: Record<ApiWorkOrderStatus, number> = {
  ASSIGNED: 0,
  IN_PROGRESS: 45,
  AWAITING_PARTS: 60,
  UNDER_VERIFICATION: 85,
  COMPLETED: 100,
  CANCELLED: 0,
};

export const workOrderStatusLabel = (status: ApiWorkOrderStatus) =>
  STATUS_META[status]?.label ?? status;

const titleCase = (v?: string) => (v ? v.charAt(0) + v.slice(1).toLowerCase() : "—");

const equipmentName = (eq: ApiWorkOrder["equipmentId"]) =>
  typeof eq === "object" && eq ? (eq as ApiEquipment).name : "—";
const equipmentCode = (eq: ApiWorkOrder["equipmentId"]) =>
  typeof eq === "object" && eq ? (eq as ApiEquipment).equipmentId : String(eq ?? "");
const deptName = (d: ApiWorkOrder["departmentId"]) =>
  typeof d === "object" && d ? (d as ApiDepartment).name : "Unassigned";
const personName = (u?: string | ApiUser) => (typeof u === "object" && u ? u.name : "Unassigned");
const complaintCode = (c: ApiWorkOrder["complaintId"]) =>
  typeof c === "object" && c ? c.complaintId : c ? String(c) : "—";

const dateLabel = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB") : "—");
const timeLabel = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "—";
const toISODate = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

/** ApiWorkOrder -> the ModuleRecord shape the existing Maintenance pages render. */
export function toWorkOrderRecord(w: ApiWorkOrder): ModuleRecord {
  const meta = STATUS_META[w.status] ?? { label: w.status, tone: "neutral" as Tone };
  const dept = deptName(w.departmentId);
  const engineer = personName(w.engineerId);
  const type = titleCase(w.maintenanceType);
  const equipment = equipmentName(w.equipmentId);

  return {
    id: w.workOrderId || w._id,
    title: w.title,
    subtitle: `${equipment} · ${dept}`,
    status: meta.label,
    tone: meta.tone,
    score: PROGRESS[w.status] ?? 0,
    scoreLabel: "Progress",
    cells: [w.workOrderId, w.title, type, dept, engineer, timeLabel(w.scheduledDate)],
    meta: [
      { label: "Work order type", value: type },
      { label: "Equipment", value: `${equipmentCode(w.equipmentId)} · ${equipment}` },
      { label: "Department", value: dept },
      { label: "Engineer", value: engineer },
      { label: "Priority", value: titleCase(w.priority) },
      { label: "Status", value: meta.label },
      { label: "Scheduled", value: dateLabel(w.scheduledDate) },
      { label: "Linked complaint", value: complaintCode(w.complaintId) },
      {
        label: "Estimated hours",
        value: w.estimatedHours != null ? String(w.estimatedHours) : "—",
      },
      { label: "Completion", value: `${PROGRESS[w.status] ?? 0}%` },
    ],
    values: {
      task: w.title,
      equipment,
      type,
      engineer,
      date: toISODate(w.scheduledDate),
      duration: w.estimatedHours != null ? String(w.estimatedHours) : "",
      checklist: w.description ?? "",
    },
    timeline: [
      {
        when: new Date(w.createdAt).toLocaleString("en-GB"),
        who: "System",
        what: `${w.workOrderId} created`,
        tone: "neutral" as Tone,
      },
      ...(w.engineerId
        ? [{ when: "—", who: engineer, what: "Assigned to engineer", tone: "violet" as Tone }]
        : []),
      ...(w.startedAt
        ? [
            {
              when: new Date(w.startedAt).toLocaleString("en-GB"),
              who: engineer,
              what: "Work started",
              tone: "primary" as Tone,
            },
          ]
        : []),
      ...(w.completedAt
        ? [
            {
              when: new Date(w.completedAt).toLocaleString("en-GB"),
              who: engineer,
              what: "Work completed",
              tone: "success" as Tone,
            },
          ]
        : []),
    ],
  } as ModuleRecord;
}

const TYPE_MAP: Record<string, ApiWorkOrder["maintenanceType"]> = {
  preventive: "PREVENTIVE",
  corrective: "CORRECTIVE",
  calibration: "CALIBRATION",
  breakdown: "BREAKDOWN",
  inspection: "PREVENTIVE",
};

export type WorkOrderFormPayload = {
  title: string;
  description?: string;
  maintenanceType: ApiWorkOrder["maintenanceType"];
  scheduledDate?: string;
  estimatedHours?: number;
  equipmentId?: string;
  engineerId?: string;
};

/** Form values (names) -> API payload (ids + enum values). */
export function toWorkOrderPayload(
  values: Record<string, string>,
  lookups: { equipmentByName: Record<string, string>; engineersByName: Record<string, string> },
): WorkOrderFormPayload {
  const equipmentId =
    lookups.equipmentByName[values["equipment"] ?? ""] ||
    lookups.equipmentByName[values["equipmentId"] ?? ""] ||
    values["equipmentId"] ||
    values["equipment"];
  const engineerId =
    lookups.engineersByName[values["engineer"] ?? ""] ||
    lookups.engineersByName[values["assignee"] ?? ""] ||
    lookups.engineersByName[values["engineerId"] ?? ""] ||
    values["engineerId"] ||
    values["engineer"] ||
    values["assignee"];
  const hours = Number(values["duration"]);
  return {
    title: values["task"] ?? values["title"] ?? "",
    description: values["checklist"] ?? values["description"] ?? "",
    maintenanceType:
      TYPE_MAP[(values["type"] ?? values["maintenanceType"] ?? "").toLowerCase()] ?? "CORRECTIVE",
    ...(values["date"] || values["scheduledDate"]
      ? { scheduledDate: values["date"] || values["scheduledDate"] }
      : {}),
    ...(Number.isFinite(hours) && (values["duration"] || values["estimatedHours"])
      ? { estimatedHours: hours }
      : {}),
    ...(equipmentId ? { equipmentId } : {}),
    ...(engineerId ? { engineerId } : {}),
  };
}
