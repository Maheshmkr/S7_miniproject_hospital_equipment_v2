import { del, get, patch, post, put } from "./client";
import type {
  ApiAuditLog,
  ApiCalibration,
  ApiCalibrationCompletion,
  ApiChecklistQuestion,
  ApiChecklistTemplate,
  ApiEquipment,
  ApiMaintenance,
  ApiWorkOrder,
  Paged,
} from "./types";

export type CalibrationQuery = {
  equipmentId?: string;
  departmentId?: string;
  engineerId?: string;
  status?: string;
  result?: string;
  calibrationType?: string;
  /** Derived schedule state filter: OVERDUE | DUE_TODAY | UPCOMING | COMPLETED */
  scheduleState?: string;
  overdue?: boolean;
  active?: boolean;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type CalibrationStats = {
  total: number;
  scheduled: number;
  inProgress: number;
  passed: number;
  failed: number;
  cancelled: number;
  dueToday: number;
  upcoming: number;
  overdue: number;
};

/** Calibration records — mirrors /api/calibration. */
export const calibrationApi = {
  list: (params?: CalibrationQuery) => get<Paged<ApiCalibration>>("/calibration", params),
  stats: (params?: CalibrationQuery) => get<CalibrationStats>("/calibration/stats", params),
  schedule: (params?: CalibrationQuery & { days?: number }) =>
    get<ApiCalibration[]>("/calibration/schedule", params),
  get: (id: string) =>
    get<{
      calibration: ApiCalibration;
      checklist: { templates: ApiChecklistTemplate[]; questions: ApiChecklistQuestion[] };
    }>(`/calibration/${id}`),
  create: (payload: Partial<ApiCalibration> & { equipmentId: string; scheduledDate: string }) =>
    post<ApiCalibration>("/calibration", payload),
  update: (id: string, payload: Partial<ApiCalibration>) =>
    put<ApiCalibration>(`/calibration/${id}`, payload),
  setStatus: (id: string, status: string, notes?: string) =>
    patch<ApiCalibration>(`/calibration/${id}/status`, { status, notes }),
  assign: (id: string, engineerId: string) =>
    patch<ApiCalibration>(`/calibration/${id}/assign`, { engineerId }),
  remove: (id: string) => del<{ deleted: string }>(`/calibration/${id}`),
  checklist: (id: string) =>
    get<{ templates: ApiChecklistTemplate[]; questions: ApiChecklistQuestion[] }>(
      `/calibration/${id}/checklist`,
    ),
  history: (id: string) =>
    get<{ logs: ApiAuditLog[]; calibrations: ApiCalibration[] }>(`/calibration/${id}/history`),
  complete: (id: string, payload: ApiCalibrationCompletion) =>
    post<{
      calibration: ApiCalibration;
      workOrder: ApiWorkOrder;
      maintenance: ApiMaintenance;
      equipment: ApiEquipment;
    }>(`/calibration/${id}/complete`, payload),
};
