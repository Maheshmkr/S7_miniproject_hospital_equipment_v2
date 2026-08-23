import { del, get, post, put } from "./client";
import type { ApiAuditLog, ApiWarranty, Paged } from "./types";

export type WarrantyQuery = {
  kind?: "WARRANTY" | "AMC";
  equipmentId?: string;
  departmentId?: string;
  vendor?: string;
  /** Derived lifecycle state: ACTIVE | EXPIRING | EXPIRED | CANCELLED */
  status?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

export type WarrantyStats = {
  total: number;
  active: number;
  expiring: number;
  expired: number;
  cancelled: number;
  equipmentCovered: number;
  expiringWindowDays: number;
};

/** Warranty & AMC contracts — mirrors /api/warranties. */
export const warrantyApi = {
  list: (params?: WarrantyQuery) => get<Paged<ApiWarranty>>("/warranties", params),
  stats: (params?: WarrantyQuery) => get<WarrantyStats>("/warranties/stats", params),
  get: (id: string) => get<ApiWarranty>(`/warranties/${id}`),
  history: (id: string) =>
    get<{ warranty: ApiWarranty; logs: ApiAuditLog[] }>(`/warranties/${id}/history`),
  create: (
    payload: Partial<ApiWarranty> & { equipmentId: string; startDate: string; endDate: string },
  ) => post<ApiWarranty>("/warranties", payload),
  update: (id: string, payload: Partial<ApiWarranty>) =>
    put<ApiWarranty>(`/warranties/${id}`, payload),
  remove: (id: string) => del<{ deleted: string }>(`/warranties/${id}`),
  forEquipment: (equipmentId: string) => get<ApiWarranty[]>(`/equipment/${equipmentId}/warranty`),
};
