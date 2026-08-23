import { del, get, patch, post, put } from "./client";
import type {
  ApiAuditLog,
  ApiChecklistQuestion,
  ApiChecklistTemplate,
  ApiEquipment,
  ApiMaintenance,
  ApiPreventivePlan,
  ApiWorkOrder,
  Paged,
} from "./types";

export type PreventiveQuery = {
  equipmentId?: string;
  departmentId?: string;
  engineerId?: string;
  frequency?: string;
  /** Derived schedule state filter: OVERDUE | DUE_TODAY | UPCOMING */
  status?: string;
  overdue?: boolean;
  active?: boolean;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type PreventiveStats = {
  total: number;
  active: number;
  inactive: number;
  dueToday: number;
  upcoming: number;
  overdue: number;
  completed: number;
};

export type PreventiveCompletion = {
  completionDate?: string;
  engineerId?: string;
  findings?: string;
  actionsTaken?: string;
  notes?: string;
  checklistResponses?: { questionId: string; response: string; notes?: string }[];
};

/** Preventive maintenance plans — mirrors /api/preventive-maintenance. */
export const preventiveApi = {
  list: (params?: PreventiveQuery) =>
    get<Paged<ApiPreventivePlan>>("/preventive-maintenance", params),
  stats: (params?: PreventiveQuery) =>
    get<PreventiveStats>("/preventive-maintenance/stats", params),
  schedule: (params?: PreventiveQuery & { days?: number }) =>
    get<ApiPreventivePlan[]>("/preventive-maintenance/schedule", params),
  get: (id: string) =>
    get<{
      plan: ApiPreventivePlan;
      checklist: { templates: ApiChecklistTemplate[]; questions: ApiChecklistQuestion[] };
    }>(`/preventive-maintenance/${id}`),
  create: (
    payload: Partial<ApiPreventivePlan> & {
      equipmentId: string;
      frequency: string;
      startDate: string;
    },
  ) => post<ApiPreventivePlan>("/preventive-maintenance", payload),
  update: (id: string, payload: Partial<ApiPreventivePlan>) =>
    put<ApiPreventivePlan>(`/preventive-maintenance/${id}`, payload),
  setActive: (id: string, active: boolean) =>
    patch<ApiPreventivePlan>(`/preventive-maintenance/${id}/status`, { active }),
  assign: (id: string, engineerId: string) =>
    patch<ApiPreventivePlan>(`/preventive-maintenance/${id}/assign`, { engineerId }),
  remove: (id: string) => del<{ deleted: string }>(`/preventive-maintenance/${id}`),
  checklist: (id: string) =>
    get<{ templates: ApiChecklistTemplate[]; questions: ApiChecklistQuestion[] }>(
      `/preventive-maintenance/${id}/checklist`,
    ),
  history: (id: string) =>
    get<{ logs: ApiAuditLog[]; maintenance: ApiMaintenance[] }>(
      `/preventive-maintenance/${id}/history`,
    ),
  complete: (id: string, payload: PreventiveCompletion = {}) =>
    post<{
      plan: ApiPreventivePlan;
      workOrder: ApiWorkOrder;
      maintenance: ApiMaintenance;
      equipment: ApiEquipment;
    }>(`/preventive-maintenance/${id}/complete`, payload),
};
