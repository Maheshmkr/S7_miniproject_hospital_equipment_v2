import { get } from "./client";

export type DashboardAnalytics = {
  totalEquipment: number;
  operational: number;
  underMaintenance: number;
  breakdown: number;
  openComplaints: number;
  resolvedComplaints: number;
  workOrders: number;
  completedWorkOrders: number;
  serviceReports: number;
  audits: number;
  maintenanceCompletionRate: number;
  avgResolutionHours: number;
};

export type Bucket = { _id: string | null; count: number; name?: string };

export const analyticsApi = {
  dashboard: () => get<DashboardAnalytics>("/analytics/dashboard"),
  equipment: () =>
    get<{
      byStatus: Bucket[];
      byCategory: Bucket[];
      byCriticality: Bucket[];
      byDepartment: Bucket[];
      averageHealth: number;
    }>("/analytics/equipment"),
  complaints: () =>
    get<{ byStatus: Bucket[]; byPriority: Bucket[]; byDepartment: Bucket[] }>(
      "/analytics/complaints",
    ),
  maintenance: () =>
    get<{
      byType: Bucket[];
      byStatus: Bucket[];
      rootCauseDistribution: Bucket[];
      engineerWorkload: Bucket[];
      avgDurationMins: number;
    }>("/analytics/maintenance"),
  departments: () =>
    get<
      {
        name: string;
        equipment: number;
        complaints: number;
        openComplaints: number;
        workOrders: number;
      }[]
    >("/analytics/departments"),
  warranty: () =>
    get<{
      total: number;
      warranties: number;
      amcs: number;
      expiringIn60Days: number;
      expired: number;
    }>("/analytics/warranty"),
  audit: () =>
    get<{ total: number; approved: number; completionRate: number; byStatus: Bucket[] }>(
      "/analytics/audit",
    ),
};
