import { del, get, patch, post, put } from "./client";
import type {
  ApiAuditLog,
  ApiChecklistQuestion,
  ApiChecklistTemplate,
  ApiComplaint,
  ApiEquipment,
  ApiEquipmentStatus,
  ApiMaintenance,
  ApiServiceReport,
  ApiWarranty,
  ApiWorkOrder,
  Paged,
} from "./types";

export type EquipmentQuery = {
  search?: string;
  status?: string;
  departmentId?: string;
  category?: string;
  criticality?: string;
  page?: number;
  limit?: number;
};

export const equipmentApi = {
  list: (params?: EquipmentQuery) => get<Paged<ApiEquipment>>("/equipment", params),
  get: (id: string) => get<ApiEquipment>(`/equipment/${id}`),
  create: (payload: Partial<ApiEquipment>) => post<ApiEquipment>("/equipment", payload),
  update: (id: string, payload: Partial<ApiEquipment>) =>
    put<ApiEquipment>(`/equipment/${id}`, payload),
  setStatus: (id: string, status: ApiEquipmentStatus, reason?: string) =>
    patch<ApiEquipment>(`/equipment/${id}/status`, { status, reason }),
  remove: (id: string) => del<null>(`/equipment/${id}`),
  history: (id: string) =>
    get<{
      equipment: ApiEquipment;
      complaints: ApiComplaint[];
      workOrders: ApiWorkOrder[];
      reports: ApiServiceReport[];
      events: ApiAuditLog[];
      warranties: ApiWarranty[];
    }>(`/equipment/${id}/history`),
  complaints: (id: string) => get<ApiComplaint[]>(`/equipment/${id}/complaints`),
  maintenance: (id: string) =>
    get<{ workOrders: ApiWorkOrder[]; maintenance: ApiMaintenance[] }>(
      `/equipment/${id}/maintenance`,
    ),
  serviceReports: (id: string) => get<ApiServiceReport[]>(`/equipment/${id}/service-reports`),
  audit: (id: string) => get<ApiAuditLog[]>(`/equipment/${id}/audit`),
  /** Administrator-configured checklist that applies to this asset. */
  checklist: (id: string, maintenanceType?: string) =>
    get<{
      equipment: Pick<ApiEquipment, "_id" | "equipmentId" | "name" | "category">;
      templates: ApiChecklistTemplate[];
      questions: ApiChecklistQuestion[];
    }>(`/equipment/${id}/checklist`, maintenanceType ? { maintenanceType } : undefined),
  warranty: (id: string) => get<ApiWarranty[]>(`/equipment/${id}/warranty`),
};
