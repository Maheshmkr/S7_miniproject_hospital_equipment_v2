import { get, post } from "./client";
import type { ApiAuditLog, Paged } from "./types";

export type ApiAuditInstance = {
  _id: string;
  templateId: string | { _id: string; name: string; scope?: string };
  equipmentId?: string | { _id: string; equipmentId: string; name: string };
  assignedTo?: string | { _id: string; name: string };
  status: "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "APPROVED" | "REJECTED";
  dueBy?: string;
  answers: { questionId: string; value: string; evidence?: string }[];
};

export const auditApi = {
  logs: (params?: {
    module?: string;
    action?: string;
    userId?: string;
    equipmentId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
  }) => get<Paged<ApiAuditLog>>("/audit-logs", params),
  log: (id: string) => get<ApiAuditLog>(`/audit-logs/${id}`),
  equipmentTrail: (equipmentId: string) => get<ApiAuditLog[]>(`/equipment/${equipmentId}/audit`),
  workOrderTrail: (workOrderId: string) => get<ApiAuditLog[]>(`/work-orders/${workOrderId}/audit`),
  maintenanceTrail: (maintenanceId: string) =>
    get<ApiAuditLog[]>(`/maintenance/${maintenanceId}/audit`),

  templates: () =>
    get<{ _id: string; name: string; scope?: string; questions: unknown[] }[]>("/audits/templates"),
  createTemplate: (payload: Record<string, unknown>) => post("/audits/templates", payload),
  audits: (status?: string) => get<ApiAuditInstance[]>("/audits", status ? { status } : undefined),
  assign: (payload: {
    templateId: string;
    equipmentId: string;
    assignedTo: string;
    dueBy?: string;
  }) => post<ApiAuditInstance>("/audits/assign", payload),
  respond: (id: string, answers: { questionId: string; value: string }[], submit = false) =>
    post<ApiAuditInstance>(`/audits/${id}/respond`, { answers, submit }),
  review: (id: string, decision: "APPROVED" | "REJECTED", reviewNote?: string) =>
    post<ApiAuditInstance>(`/audits/${id}/review`, { decision, reviewNote }),
};
