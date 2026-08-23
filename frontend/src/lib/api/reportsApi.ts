import { get } from "./client";

export type ReportQuery = {
  dateFrom?: string;
  dateTo?: string;
  departmentId?: string;
  status?: string;
  category?: string;
  equipmentId?: string;
  engineerId?: string;
};

type ReportResult<T = Record<string, unknown>> = {
  items: T[];
  total: number;
  [key: string]: unknown;
};

export const reportsApi = {
  equipment: (params?: ReportQuery) => get<ReportResult>("/reports/equipment", params),
  complaints: (params?: ReportQuery) => get<ReportResult>("/reports/complaints", params),
  maintenance: (params?: ReportQuery) => get<ReportResult>("/reports/maintenance", params),
  departments: (params?: ReportQuery) => get<ReportResult>("/reports/departments", params),
  warranty: (params?: ReportQuery) => get<ReportResult>("/reports/warranty", params),
  audit: (params?: ReportQuery & { module?: string }) =>
    get<ReportResult>("/reports/audit", params),
};
