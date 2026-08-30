import { get, put } from "./client";
import type { ApiServiceReport, Paged } from "./types";

export const serviceReportsApi = {
  list: (params?: {
    equipmentId?: string;
    engineerId?: string;
    status?: string;
    departmentId?: string;
    page?: number;
    limit?: number;
  }) => get<Paged<ApiServiceReport>>("/service-reports", params),
  get: (id: string) => get<ApiServiceReport>(`/service-reports/${id}`),
  update: (id: string, payload: Partial<ApiServiceReport> & { reviewNote?: string }) =>
    put<ApiServiceReport>(`/service-reports/${id}`, payload),
};
