import type { StaffMaintenance } from "@/lib/staff";
import type { ApiEquipment, ApiMaintenance, ApiUser, ApiWorkOrder } from "./types";

/** Progress the existing Maintenance UI renders for each backend status. */
const PROGRESS: Record<ApiMaintenance["status"], number> = {
  STARTED: 10,
  INVESTIGATION: 30,
  IN_PROGRESS: 55,
  AWAITING_PARTS: 65,
  TESTING: 85,
  COMPLETED: 100,
  CANCELLED: 0,
};

const STAGE: Record<ApiMaintenance["status"], string> = {
  STARTED: "Started",
  INVESTIGATION: "Investigation",
  IN_PROGRESS: "Maintenance",
  AWAITING_PARTS: "Awaiting parts",
  TESTING: "Verification",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/** Backend status -> the four labels the existing staff UI knows about. */
const STATUS: Record<ApiMaintenance["status"], StaffMaintenance["status"]> = {
  STARTED: "Scheduled",
  INVESTIGATION: "In Progress",
  IN_PROGRESS: "In Progress",
  AWAITING_PARTS: "Awaiting Parts",
  TESTING: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Completed",
};

const TYPE: Record<string, StaffMaintenance["type"]> = {
  PREVENTIVE: "Preventive",
  CORRECTIVE: "Corrective",
  BREAKDOWN: "Corrective",
  CALIBRATION: "Calibration",
};

export const maintenanceProgress = (status: ApiMaintenance["status"]) => PROGRESS[status] ?? 0;
export const maintenanceStageLabel = (status: ApiMaintenance["status"]) => STAGE[status] ?? status;

const stamp = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const person = (u?: string | ApiUser) => (typeof u === "object" && u ? u.name : "Unassigned");
const equipmentCode = (e?: string | ApiEquipment) =>
  typeof e === "object" && e ? e.equipmentId : String(e ?? "");
const workOrderCode = (w?: string | ApiWorkOrder) =>
  typeof w === "object" && w ? w.workOrderId : w ? String(w) : "";

/** ApiMaintenance -> the StaffMaintenance shape the existing staff pages render. */
export function toStaffMaintenance(m: ApiMaintenance): StaffMaintenance {
  const complaint = m.complaintId;
  const complaintCode =
    typeof complaint === "object" && complaint ? complaint.complaintId : complaint;
  const steps: { label: string; done: boolean }[] = [
    { label: "Maintenance started", done: true },
    { label: "Investigation and root cause", done: Boolean(m.rootCause) },
    { label: "Corrective action performed", done: Boolean(m.correctiveAction) },
    { label: "Verification and testing", done: ["TESTING", "COMPLETED"].includes(m.status) },
    { label: "Released back to service", done: m.status === "COMPLETED" },
  ];

  return {
    id: m.maintenanceId,
    ...(complaintCode ? { complaintId: String(complaintCode) } : {}),
    equipmentId: equipmentCode(m.equipmentId),
    engineer: person(m.engineerId),
    type: TYPE[m.maintenanceType] ?? "Corrective",
    stage: maintenanceStageLabel(m.status),
    status: STATUS[m.status] ?? "In Progress",
    progress: maintenanceProgress(m.status),
    started: stamp(m.startTime ?? m.createdAt),
    expected: stamp(m.endTime),
    parts: (m.partsUsed ?? []).map((p) => ({
      part: p.name ?? "Part",
      code: p.partNo ?? "—",
      qty: p.qty ?? 1,
      status: m.status === "AWAITING_PARTS" ? "On order" : "Fitted",
    })),
    remarks:
      m.remarks ||
      m.correctiveAction ||
      m.description ||
      `${maintenanceStageLabel(m.status)} · work order ${workOrderCode(m.workOrderId) || "—"}`,
    images: [],
    steps,
    timeline: [],
  };
}
