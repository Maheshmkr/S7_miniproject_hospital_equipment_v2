import { get } from "./client";

export type Bucket = { _id: string | null; count: number; name?: string };

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
  healthTrend: { month: string; health: number; uptime: number; incidents: number }[];
  costSplit: { name: string; value: number }[];
  complaintFlow: { day: string; raised: number; resolved: number }[];
  departments: {
    name: string;
    assets: number;
    complaints: number;
    staff: number;
    uptime: number;
    score: number;
  }[];
  engineers: { name: string; avatar: string; zone: string; open: number; load: number }[];
};

export type WorkOrderAnalytics = {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  byPriority: Bucket[];
  byStatus: Bucket[];
};

export type CalibrationAnalytics = {
  total: number;
  passed: number;
  failed: number;
  overdue: number;
  complianceRate: number;
  byStatus: Bucket[];
  byResult: Bucket[];
};

export type PreventiveAnalytics = {
  total: number;
  completed: number;
  upcoming: number;
  overdue: number;
  complianceRate: number;
  byStatus: Bucket[];
};

export type TrendData = {
  period: string;
  complaints: number;
  workOrders: number;
};

export type DistributionData = {
  equipmentStatus: Bucket[];
  equipmentCategory: Bucket[];
  equipmentCriticality: Bucket[];
};

export type ComparisonData = {
  name: string;
  complaints: number;
  workOrders: number;
};

export type CostData = {
  equipmentPurchaseCost: number;
  maintenanceCost: number;
  purchaseOrderCost: number;
  totalCost: number;
};

export type ComplianceData = {
  ppmCompliance: number;
  calibrationCompliance: number;
  overallCompliance: number;
};

export type AvailabilityData = {
  overall: number;
  operational: number;
  total: number;
};

export type BreakdownData = {
  count: number;
  mttrHours: number;
  mttrMinutes: number;
};

export type AnalyticsFilter = {
  dateFrom?: string;
  dateTo?: string;
  from?: string;
  to?: string;
  departmentId?: string;
  status?: string;
  category?: string;
  equipmentId?: string;
  engineerId?: string;
};

export const analyticsApi = {
  dashboard: (filters?: AnalyticsFilter) =>
    get<DashboardAnalytics>("/analytics/dashboard", filters),
  equipment: (filters?: AnalyticsFilter) =>
    get<{
      byStatus: Bucket[];
      byCategory: Bucket[];
      byCriticality: Bucket[];
      byDepartment: Bucket[];
      averageHealth: number;
    }>("/analytics/equipment", filters),
  complaints: (filters?: AnalyticsFilter) =>
    get<{ byStatus: Bucket[]; byPriority: Bucket[]; byDepartment: Bucket[] }>(
      "/analytics/complaints",
      filters,
    ),
  maintenance: (filters?: AnalyticsFilter) =>
    get<{
      byType: Bucket[];
      byStatus: Bucket[];
      rootCauseDistribution: Bucket[];
      engineerWorkload: Bucket[];
      avgDurationMins: number;
    }>("/analytics/maintenance", filters),
  departments: (filters?: AnalyticsFilter) =>
    get<
      {
        name: string;
        equipment: number;
        complaints: number;
        openComplaints: number;
        workOrders: number;
      }[]
    >("/analytics/departments", filters),
  warranty: (filters?: AnalyticsFilter) =>
    get<{
      total: number;
      warranties: number;
      amcs: number;
      expiringIn60Days: number;
      expired: number;
    }>("/analytics/warranty", filters),
  audit: (filters?: AnalyticsFilter) =>
    get<{ total: number; approved: number; completionRate: number; byStatus: Bucket[] }>(
      "/analytics/audit",
      filters,
    ),
  workOrders: (filters?: AnalyticsFilter) =>
    get<WorkOrderAnalytics>("/analytics/work-orders", filters),
  calibration: (filters?: AnalyticsFilter) =>
    get<CalibrationAnalytics>("/analytics/calibration", filters),
  preventiveMaintenance: (filters?: AnalyticsFilter) =>
    get<PreventiveAnalytics>("/analytics/preventive-maintenance", filters),
  trends: (filters?: AnalyticsFilter) => get<TrendData[]>("/analytics/trends", filters),
  distributions: (filters?: AnalyticsFilter) =>
    get<DistributionData>("/analytics/distributions", filters),
  comparativePerformance: (filters?: AnalyticsFilter) =>
    get<ComparisonData[]>("/analytics/comparative-performance", filters),
  costs: (filters?: AnalyticsFilter) => get<CostData>("/analytics/costs", filters),
  compliance: (filters?: AnalyticsFilter) => get<ComplianceData>("/analytics/compliance", filters),
  availability: (filters?: AnalyticsFilter) =>
    get<AvailabilityData>("/analytics/availability", filters),
  breakdowns: (filters?: AnalyticsFilter) => get<BreakdownData>("/analytics/breakdowns", filters),
};
