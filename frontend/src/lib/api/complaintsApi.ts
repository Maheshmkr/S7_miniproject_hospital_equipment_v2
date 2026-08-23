import { del, get, patch, post, put } from "./client";
import type { ApiAuditLog, ApiComplaint, ApiComplaintStatus, Paged } from "./types";

export const complaintsApi = {
  list: (params?: {
    status?: string;
    priority?: string;
    departmentId?: string;
    equipmentId?: string;
    engineerId?: string;
    reportedBy?: string;
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => get<Paged<ApiComplaint>>("/complaints", params),
  get: (id: string) => get<ApiComplaint>(`/complaints/${id}`),
  create: (payload: {
    equipmentId: string;
    title: string;
    description: string;
    priority?: string;
    departmentId?: string;
  }) => post<ApiComplaint>("/complaints", payload),
  update: (id: string, payload: Partial<ApiComplaint>) =>
    put<ApiComplaint>(`/complaints/${id}`, payload),
  setStatus: (id: string, status: ApiComplaintStatus) =>
    patch<ApiComplaint>(`/complaints/${id}/status`, { status }),
  assign: (id: string, engineerId: string) =>
    patch<ApiComplaint>(`/complaints/${id}/assign`, { engineerId }),
  history: (id: string) =>
    get<{ complaint: ApiComplaint; events: ApiAuditLog[] }>(`/complaints/${id}/history`),
  comment: (id: string, body: string) => post<ApiComplaint>(`/complaints/${id}/messages`, { body }),
  remove: (id: string) => del<null>(`/complaints/${id}`),
  transitions: (id: string) =>
    get<{ status: ApiComplaintStatus; next: ApiComplaintStatus[] }>(
      `/complaints/${id}/transitions`,
    ),
};
