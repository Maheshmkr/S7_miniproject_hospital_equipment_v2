import { del, get, patch, post, put } from "./client";
import type { ApiAuditLog, ApiPurchaseOrder, ApiPurchaseOrderInput, Paged } from "./types";

export type PurchaseOrderQuery = {
  status?: string;
  priority?: string;
  vendorId?: string;
  departmentId?: string;
  poNumber?: string;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type PurchaseOrderStats = {
  total: number;
  pendingApproval: number;
  approved: number;
  ordered: number;
  received: number;
  committedValue: number;
  byStatus: Record<string, number>;
};

/** Purchase orders — mirrors /api/purchase-orders. */
export const purchaseOrdersApi = {
  list: (params?: PurchaseOrderQuery) => get<Paged<ApiPurchaseOrder>>("/purchase-orders", params),
  stats: () => get<PurchaseOrderStats>("/purchase-orders/stats"),
  get: (id: string) => get<ApiPurchaseOrder>(`/purchase-orders/${id}`),
  history: (id: string) =>
    get<{ purchaseOrder: ApiPurchaseOrder; logs: ApiAuditLog[] }>(`/purchase-orders/${id}/history`),
  create: (payload: ApiPurchaseOrderInput) => post<ApiPurchaseOrder>("/purchase-orders", payload),
  update: (id: string, payload: Partial<ApiPurchaseOrderInput>) =>
    put<ApiPurchaseOrder>(`/purchase-orders/${id}`, payload),
  setStatus: (id: string, status: string, reason?: string) =>
    patch<ApiPurchaseOrder>(`/purchase-orders/${id}/status`, { status, reason }),
  approve: (id: string, reason?: string) =>
    patch<ApiPurchaseOrder>(`/purchase-orders/${id}/approve`, { reason }),
  reject: (id: string, reason?: string) =>
    patch<ApiPurchaseOrder>(`/purchase-orders/${id}/reject`, { reason }),
  remove: (id: string) => del<{ deleted: string }>(`/purchase-orders/${id}`),
};
