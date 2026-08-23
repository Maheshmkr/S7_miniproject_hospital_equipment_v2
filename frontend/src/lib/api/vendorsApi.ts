import { del, get, patch, post, put } from "./client";
import type { ApiAuditLog, ApiEquipment, ApiVendor, ApiWarranty, Paged } from "./types";

export type VendorQuery = {
  name?: string;
  vendorCode?: string;
  category?: string;
  status?: string;
  city?: string;
  state?: string;
  specialization?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type VendorStats = {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  byCategory: Record<string, number>;
};

export type VendorDetail = {
  vendor: ApiVendor;
  warranties: ApiWarranty[];
  equipment: ApiEquipment[];
};

/** Vendor register — mirrors /api/vendors. */
export const vendorsApi = {
  list: (params?: VendorQuery) => get<Paged<ApiVendor>>("/vendors", params),
  stats: () => get<VendorStats>("/vendors/stats"),
  get: (id: string) => get<VendorDetail>(`/vendors/${id}`),
  history: (id: string) =>
    get<{ vendor: ApiVendor; logs: ApiAuditLog[] }>(`/vendors/${id}/history`),
  create: (payload: Partial<ApiVendor> & { name: string }) => post<ApiVendor>("/vendors", payload),
  update: (id: string, payload: Partial<ApiVendor>) => put<ApiVendor>(`/vendors/${id}`, payload),
  setStatus: (id: string, status: ApiVendor["status"]) =>
    patch<ApiVendor>(`/vendors/${id}/status`, { status }),
  remove: (id: string) => del<{ deleted: string }>(`/vendors/${id}`),
};
