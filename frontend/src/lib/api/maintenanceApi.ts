import { client, del, get, patch, post, put, request } from "./client";
import type {
  ApiAuditLog,
  ApiChecklistQuestion,
  ApiChecklistResponse,
  ApiChecklistTemplate,
  ApiEquipment,
  ApiEvidence,
  ApiInvestigation,
  ApiMaintenance,
  ApiServiceReport,
  ApiWorkOrder,
  Paged,
} from "./types";

export type MaintenanceQuery = {
  status?: string;
  engineerId?: string;
  equipmentId?: string;
  workOrderId?: string;
  departmentId?: string;
  maintenanceType?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type MaintenanceStats = {
  total: number;
  inProgress: number;
  completed: number;
  awaitingParts: number;
  planned: number;
};

export const maintenanceApi = {
  list: (params?: MaintenanceQuery) => get<Paged<ApiMaintenance>>("/maintenance", params),
  stats: (params?: MaintenanceQuery) => get<MaintenanceStats>("/maintenance/stats", params),
  create: (payload: {
    workOrderId: string;
    engineerId?: string;
    maintenanceType?: string;
    description?: string;
    initialCondition?: string;
    safetyPrecautions?: string;
  }) => post<ApiMaintenance>("/maintenance", payload),
  setStatus: (id: string, status: ApiMaintenance["status"]) =>
    patch<ApiMaintenance>(`/maintenance/${id}/status`, { status }),
  assign: (id: string, engineerId: string) =>
    patch<ApiMaintenance>(`/maintenance/${id}/assign`, { engineerId }),
  transitions: (id: string) =>
    get<{ status: ApiMaintenance["status"]; next: ApiMaintenance["status"][] }>(
      `/maintenance/${id}/transitions`,
    ),
  remove: (id: string) => del<{ deleted: string }>(`/maintenance/${id}`),
  get: (id: string) =>
    get<{
      maintenance: ApiMaintenance;
      checklistResponses: ApiChecklistResponse[];
      evidence: ApiEvidence[];
      serviceReport?: ApiServiceReport;
    }>(`/maintenance/${id}`),
  update: (id: string, payload: Partial<ApiMaintenance>) =>
    put<ApiMaintenance>(`/maintenance/${id}`, payload),
  checklist: (id: string) =>
    get<{
      templates: ApiChecklistTemplate[];
      questions: ApiChecklistQuestion[];
      responses: ApiChecklistResponse[];
    }>(`/maintenance/${id}/checklist`),
  submitChecklist: (
    id: string,
    answers: { questionId: string; response: string; notes?: string; evidence?: string[] }[],
  ) => post<ApiChecklistResponse[]>(`/maintenance/${id}/checklist`, { answers }),
  getInvestigation: (id: string) =>
    get<ApiInvestigation | null>(`/maintenance/${id}/investigation`),
  saveInvestigation: (id: string, payload: Partial<ApiInvestigation>) =>
    post<ApiInvestigation>(`/maintenance/${id}/investigation`, payload),
  evidence: (id: string) => get<ApiEvidence[]>(`/maintenance/${id}/evidence`),
  uploadEvidence: (id: string, files: File[], category = "DOCUMENT", note?: string) => {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    form.append("category", category);
    if (note) form.append("note", note);
    return request<ApiEvidence[]>(() =>
      client.post(`/maintenance/${id}/evidence`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      }),
    );
  },
  createServiceReport: (id: string, payload: Partial<ApiServiceReport>) =>
    post<ApiServiceReport>(`/maintenance/${id}/service-report`, payload),
  complete: (
    id: string,
    payload?: {
      finalCondition?: string;
      remarks?: string;
      verification?: { safetyVerified: boolean; performanceVerified?: boolean };
    },
  ) =>
    post<{
      maintenance: ApiMaintenance;
      workOrder: ApiWorkOrder;
      equipment: ApiEquipment;
      serviceReport: ApiServiceReport;
    }>(`/maintenance/${id}/complete`, payload ?? {}),
  history: (id: string) => get<ApiAuditLog[]>(`/maintenance/${id}/history`),
};
