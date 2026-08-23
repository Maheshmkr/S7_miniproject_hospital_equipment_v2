/**
 * Shared hospital equipment lifecycle domain model.
 *
 * This is the single source of truth for equipment → complaints → maintenance →
 * service reports → audits → audit trail. It is deliberately transport-agnostic:
 * every read/write goes through the repository in `./repository`, so the mock
 * implementation can later be swapped for `axios` calls to an Express/Mongoose API
 * without touching a single component.
 */

/* ------------------------------- Status models ------------------------------- */

export const equipmentStatuses = [
  "Active",
  "Under Breakdown",
  "Under Maintenance",
  "Awaiting Parts",
  "Maintenance Completed",
  "Under Verification",
  "Operational",
  "Out of Service",
  "Retired",
] as const;
export type EquipmentStatus = (typeof equipmentStatuses)[number];

/** Allowed forward transitions of the equipment lifecycle. */
export const equipmentTransitions: Record<EquipmentStatus, EquipmentStatus[]> = {
  Active: ["Under Breakdown", "Under Maintenance", "Out of Service", "Retired"],
  "Under Breakdown": ["Under Maintenance", "Out of Service"],
  "Under Maintenance": ["Awaiting Parts", "Maintenance Completed", "Out of Service"],
  "Awaiting Parts": ["Under Maintenance", "Out of Service"],
  "Maintenance Completed": ["Under Verification"],
  "Under Verification": ["Operational", "Under Maintenance"],
  Operational: ["Active", "Under Breakdown", "Under Maintenance", "Retired"],
  "Out of Service": ["Under Maintenance", "Retired"],
  Retired: [],
};

export const complaintStatuses = [
  "Open",
  "Under Review",
  "Assigned",
  "Investigation",
  "Maintenance In Progress",
  "Awaiting Parts",
  "Testing",
  "Resolved",
  "Closed",
] as const;
export type ComplaintStatus = (typeof complaintStatuses)[number];

export const complaintTransitions: Record<ComplaintStatus, ComplaintStatus[]> = {
  Open: ["Under Review"],
  "Under Review": ["Assigned"],
  Assigned: ["Investigation"],
  Investigation: ["Maintenance In Progress"],
  "Maintenance In Progress": ["Awaiting Parts", "Testing"],
  "Awaiting Parts": ["Maintenance In Progress"],
  Testing: ["Resolved", "Maintenance In Progress"],
  Resolved: ["Closed"],
  Closed: [],
};

export function canTransition<T extends string>(map: Record<T, T[]>, from: T, to: T): boolean {
  return from === to || (map[from] ?? []).includes(to);
}

export type Priority = "Low" | "Medium" | "High" | "Critical";
export type Role = "admin" | "engineer" | "staff";

/* --------------------------------- Entities ---------------------------------- */

export type LifecycleEquipment = {
  id: string;
  name: string;
  category: string;
  department: string;
  vendor: string;
  model: string;
  serial: string;
  status: EquipmentStatus;
  health: number;
  installed: string;
  location: string;
  cost: string;
  amcId?: string;
  lastPreventive: string;
  nextPreventive: string;
  preventiveOverdue: boolean;
  documents: { name: string; kind: string; when: string }[];
};

export type ComplaintMessage = {
  who: string;
  role: Role;
  when: string;
  body: string;
};

export type LifecycleComplaint = {
  id: string;
  equipmentId: string;
  title: string;
  description: string;
  department: string;
  priority: Priority;
  status: ComplaintStatus;
  reportedBy: string;
  reportedAt: string;
  assignedEngineer?: string;
  assignedAt?: string;
  workOrderId?: string;
  evidence: { name: string; kind: string; when: string }[];
  messages: ComplaintMessage[];
};

/* --------------------- Administrator checklist configuration ------------------- */

/** Response types an administrator can configure for a maintenance checklist question. */
export const checklistResponseTypes = [
  "passfail",
  "yesno",
  "text",
  "number",
  "dropdown",
  "date",
  "evidence",
] as const;
export type ChecklistResponseType = (typeof checklistResponseTypes)[number];

export const checklistResponseLabels: Record<ChecklistResponseType, string> = {
  passfail: "Pass / Fail",
  yesno: "Yes / No",
  text: "Text",
  number: "Number",
  dropdown: "Dropdown",
  date: "Date",
  evidence: "File / Evidence",
};

export type ChecklistPriority = "Low" | "Medium" | "High" | "Critical";

/**
 * Checklist template owned by the administrator. A template is scoped to an
 * equipment category (and optionally a maintenance type); every asset in that
 * category inherits its questions.
 */
export type ChecklistTemplate = {
  id: string;
  name: string;
  category: string;
  maintenanceType: MaintenanceType | "All";
  description: string;
  createdBy: string;
  createdAt: string;
  active: boolean;
};

/**
 * A single configured question. `equipmentId` is set only for equipment-specific
 * questions — those appear for that one asset on top of the inherited category set.
 */
export type ChecklistQuestion = {
  id: string;
  templateId: string;
  category: string;
  equipmentId?: string;
  maintenanceType: MaintenanceType | "All";
  text: string;
  responseType: ChecklistResponseType;
  options?: string[];
  required: boolean;
  priority: ChecklistPriority;
  order: number;
  helpText?: string;
  active: boolean;
};

/** Engineer answer to a configured question, stored on the work order. */
export type ChecklistItem = {
  id: string;
  label: string;
  /** Configured question this answer belongs to (absent for legacy free items). */
  questionId?: string;
  templateId?: string;
  responseType?: ChecklistResponseType;
  options?: string[];
  required?: boolean;
  priority?: ChecklistPriority;
  helpText?: string;
  scope?: "category" | "equipment";
  /** Normalised outcome used by validation, RCA and analytics. */
  result?: "pass" | "fail" | "na";
  /** Raw captured value for text / number / date / dropdown / evidence answers. */
  value?: string;
  note?: string;
  answeredBy?: string;
  answeredAt?: string;
};

export type PartUsed = { name: string; partNo: string; qty: number; cost: number };

export type RootCause = {
  problemObserved: string;
  diagnosticFindings: string;
  category: RootCauseCategory;
  description: string;
  contributingFactor: string;
  evidenceNote: string;
  correctiveAction: string;
  preventiveAction: string;
  recordedAt?: string;
  recordedBy?: string;
};

export const rootCauseCategories = [
  "Calibration drift",
  "Component wear",
  "Electrical fault",
  "Software fault",
  "User error",
  "Environmental",
  "Consumable depletion",
  "Overdue preventive maintenance",
] as const;
export type RootCauseCategory = (typeof rootCauseCategories)[number];

export type MaintenanceType = "Preventive" | "Corrective" | "Breakdown" | "Calibration";

export const workOrderStages = [
  "Assigned",
  "Investigation",
  "Checklist",
  "Root Cause",
  "Corrective Action",
  "Evidence",
  "Testing",
  "Report",
  "Submitted",
  "Approved",
] as const;
export type WorkOrderStage = (typeof workOrderStages)[number];

export type LifecycleWorkOrder = {
  id: string;
  equipmentId: string;
  complaintId?: string;
  title: string;
  type: MaintenanceType;
  engineer: string;
  department: string;
  scheduledFor: string;
  stage: WorkOrderStage;
  startedAt?: string;
  completedAt?: string;
  durationMins?: number;
  checklist: ChecklistItem[];
  rootCause?: RootCause;
  parts: PartUsed[];
  tools: string[];
  evidence: { name: string; kind: string; when: string; phase: "before" | "after" | "document" }[];
  testResults: { name: string; expected: string; actual: string; pass: boolean }[];
  safetyVerified?: boolean;
  finalCondition?: EquipmentStatus;
  serviceReportId?: string;
};

export type ServiceReport = {
  id: string;
  workOrderId: string;
  equipmentId: string;
  complaintId?: string;
  engineer: string;
  summary: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  decision: "Draft" | "Submitted" | "Approved" | "Rejected";
  reviewNote?: string;
};

/* ---------------------------------- Audits ----------------------------------- */

export const auditResponseTypes = [
  "yesno",
  "text",
  "number",
  "date",
  "dropdown",
  "evidence",
] as const;
export type AuditResponseType = (typeof auditResponseTypes)[number];

export type AuditQuestion = {
  id: string;
  prompt: string;
  type: AuditResponseType;
  required: boolean;
  options?: string[];
  helper?: string;
};

export type AuditTemplate = {
  id: string;
  name: string;
  scope: string;
  description: string;
  createdBy: string;
  createdAt: string;
  active: boolean;
  questions: AuditQuestion[];
};

export type AuditAnswer = { questionId: string; value: string; evidence?: string };

export type AuditStatus = "Assigned" | "In Progress" | "Submitted" | "Approved" | "Rejected";

export type AuditInstance = {
  id: string;
  templateId: string;
  equipmentId: string;
  workOrderId?: string;
  complaintId?: string;
  assignedTo: string;
  assignedBy: string;
  assignedAt: string;
  dueBy: string;
  status: AuditStatus;
  answers: AuditAnswer[];
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNote?: string;
};

/* -------------------------------- Audit trail --------------------------------- */

export type AuditEvent = {
  id: string;
  at: string; // ISO
  user: string;
  role: Role | "system";
  action: string;
  module: "Equipment" | "Complaint" | "Maintenance" | "Service Report" | "Audit";
  recordId: string;
  equipmentId?: string;
  previousStatus?: string;
  newStatus?: string;
  description: string;
};

export type LifecycleState = {
  equipment: LifecycleEquipment[];
  complaints: LifecycleComplaint[];
  workOrders: LifecycleWorkOrder[];
  reports: ServiceReport[];
  templates: AuditTemplate[];
  audits: AuditInstance[];
  events: AuditEvent[];
  checklistTemplates: ChecklistTemplate[];
  checklistQuestions: ChecklistQuestion[];
};

export type Actor = { name: string; role: Role };
