import { del, get, patch, post, put } from "./client";
import type {
  ApiAuditLog,
  ApiWorkOrder,
  ApiWorkOrderContext,
  ApiWorkOrderStatus,
  Paged,
} from "./types";

export const workOrdersApi = {
  list: (params?: {
    status?: string;
    priority?: string;
    engineerId?: string;
    equipmentId?: string;
    complaintId?: string;
    departmentId?: string;
    maintenanceType?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => get<Paged<ApiWorkOrder>>("/work-orders", params),

  /** Assigned Tasks for the signed-in biomedical engineer. */
  mine: (status?: string) =>
    get<{ items: ApiWorkOrder[]; total: number }>(
      "/engineers/me/work-orders",
      status ? { status } : undefined,
    ),
  /** Full context: work order + equipment + complaint + department + engineer. */
  get: (id: string) => get<ApiWorkOrderContext>(`/work-orders/${id}`),
  create: (payload: Partial<ApiWorkOrder> & { equipmentId: string; title: string }) =>
    post<ApiWorkOrder>("/work-orders", payload),
  update: (id: string, payload: Partial<ApiWorkOrder>) =>
    put<ApiWorkOrder>(`/work-orders/${id}`, payload),
  assign: (id: string, engineerId: string) =>
    patch<ApiWorkOrder>(`/work-orders/${id}/assign`, { engineerId }),
  remove: (id: string) => del<{ deleted: boolean; workOrderId: string }>(`/work-orders/${id}`),
  transitions: (id: string) =>
    get<{ status: ApiWorkOrderStatus; next: ApiWorkOrderStatus[] }>(
      `/work-orders/${id}/transitions`,
    ),

  setStatus: (id: string, status: ApiWorkOrderStatus) =>
    patch<ApiWorkOrder>(`/work-orders/${id}/status`, { status }),
  history: (id: string) => get<ApiAuditLog[]>(`/work-orders/${id}/history`),
  audit: (id: string) => get<ApiAuditLog[]>(`/work-orders/${id}/audit`),
  /** Start maintenance — cascades work order, equipment and complaint statuses. */
  start: (id: string, payload?: { initialCondition?: string; safetyPrecautions?: string }) =>
    post<ApiWorkOrderContext>(`/work-orders/${id}/start`, payload ?? {}),
};
