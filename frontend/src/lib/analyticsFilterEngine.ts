import type { ModuleRecord } from "./modules";

export type DatePreset =
  | "all"
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year"
  | "custom";

export interface AnalyticsFilterState {
  datePreset: DatePreset;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  departmentId?: string;
  departmentName?: string;
  status?: string;
  category?: string;
  criticality?: string;
  priority?: string;
  maintenanceType?: string;
  engineerId?: string;
  engineerName?: string;
  vendor?: string;
  role?: string;
  query?: string;
}

export const DEFAULT_ANALYTICS_FILTERS: AnalyticsFilterState = {
  datePreset: "all",
  dateFrom: undefined,
  dateTo: undefined,
  departmentId: undefined,
  departmentName: undefined,
  status: undefined,
  category: undefined,
  criticality: undefined,
  priority: undefined,
  maintenanceType: undefined,
  engineerId: undefined,
  engineerName: undefined,
  vendor: undefined,
  role: undefined,
  query: undefined,
};

/**
 * Format a Date to YYYY-MM-DD string
 */
export function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Resolves a date preset into concrete from and to YYYY-MM-DD dates and human label
 */
export function resolveDateRange(
  preset: DatePreset,
  customFrom?: string,
  customTo?: string,
): { from?: string; to?: string; label: string } {
  const now = new Date();
  const todayStr = formatYmd(now);

  switch (preset) {
    case "today":
      return { from: todayStr, to: todayStr, label: "Today" };

    case "yesterday": {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatYmd(y);
      return { from: yStr, to: yStr, label: "Yesterday" };
    }

    case "7d": {
      const d7 = new Date(now);
      d7.setDate(d7.getDate() - 7);
      return { from: formatYmd(d7), to: todayStr, label: "Last 7 Days" };
    }

    case "30d": {
      const d30 = new Date(now);
      d30.setDate(d30.getDate() - 30);
      return { from: formatYmd(d30), to: todayStr, label: "Last 30 Days" };
    }

    case "90d": {
      const d90 = new Date(now);
      d90.setDate(d90.getDate() - 90);
      return { from: formatYmd(d90), to: todayStr, label: "Last 90 Days" };
    }

    case "this-month": {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatYmd(startOfMonth), to: todayStr, label: "This Month" };
    }

    case "last-month": {
      const startOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLast = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: formatYmd(startOfLast), to: formatYmd(endOfLast), label: "Last Month" };
    }

    case "this-quarter": {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const startOfQ = new Date(now.getFullYear(), qMonth, 1);
      return { from: formatYmd(startOfQ), to: todayStr, label: "This Quarter" };
    }

    case "this-year": {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return { from: formatYmd(startOfYear), to: todayStr, label: "This Year" };
    }

    case "custom": {
      const label =
        customFrom && customTo
          ? `${customFrom} to ${customTo}`
          : customFrom
            ? `From ${customFrom}`
            : customTo
              ? `Until ${customTo}`
              : "Custom Range";
      return { from: customFrom, to: customTo, label };
    }

    case "all":
    default:
      return { from: undefined, to: undefined, label: "All Time" };
  }
}

/**
 * Parses arbitrary date values (ISO, DD/MM/YYYY, '12 Feb 2024', timestamps) into a Date object
 */
export function parseFuzzyDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === "number") return new Date(val);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return null;
    // Check YYYY-MM-DD
    const isoParsed = Date.parse(trimmed);
    if (!isNaN(isoParsed)) return new Date(isoParsed);
    // Check DD/MM/YYYY
    const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) {
      return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    }
  }
  return null;
}

/**
 * Checks whether a given record date falls within from...to bounds (inclusive).
 */
export function isDateInRange(dateVal: unknown, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const d = parseFuzzyDate(dateVal);
  if (!d) return true; // If no date on record, do not aggressively exclude

  const ymd = formatYmd(d);
  if (from && ymd < from) return false;
  if (to && ymd > to) return false;
  return true;
}

/**
 * Extracts possible date representation from a generic record or ModuleRecord
 */
export function extractRecordDate(record: Record<string, any>): Date | null {
  const candidates = [
    record.createdAt,
    record.date,
    record.when,
    record.installed,
    record.lastService,
    record.nextService,
    record.scheduledDate,
    record.resolvedAt,
    record.manufactured,
    record.warranty,
    record.expiryDate,
  ];

  for (const c of candidates) {
    const parsed = parseFuzzyDate(c);
    if (parsed) return parsed;
  }

  // Check timeline in ModuleRecord
  if (Array.isArray(record.timeline) && record.timeline.length > 0) {
    const firstTimeline = record.timeline[0]?.when;
    if (firstTimeline) {
      const parsed = parseFuzzyDate(firstTimeline);
      if (parsed) return parsed;
    }
  }

  // Check meta items
  if (Array.isArray(record.meta)) {
    for (const item of record.meta) {
      if (
        item.label &&
        /date|created|installed|updated|when|time/i.test(item.label) &&
        item.value
      ) {
        const parsed = parseFuzzyDate(item.value);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

/**
 * Normalizes text for case-insensitive matching
 */
const norm = (s: unknown): string => (s ? String(s).trim().toLowerCase() : "");

/**
 * Robust bidirectional fuzzy match for filter fields.
 * Handles cases where database has "Radiology & Imaging" and record has "Radiology",
 * or vice-versa, as well as abbreviations and sub-tokens.
 */
export function fuzzyMatchText(recordValue?: string, targetValue?: string): boolean {
  if (!targetValue || targetValue === "all") return true;
  if (!recordValue) return false;

  const a = norm(recordValue);
  const b = norm(targetValue);

  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;

  // Split on delimiters (&, /, -, _, space) to match individual key words (length >= 3)
  const wordsA = a.split(/[\s&,/_-]+/).filter((w) => w.length >= 3);
  const wordsB = b.split(/[\s&,/_-]+/).filter((w) => w.length >= 3);

  return wordsA.some((wa) =>
    wordsB.some((wb) => wa === wb || wa.includes(wb) || wb.includes(wa)),
  );
}

/**
 * Reusable filter for ModuleRecord arrays
 */
export function filterModuleRecords(
  records: ModuleRecord[],
  filters: AnalyticsFilterState,
): ModuleRecord[] {
  const { from, to } = resolveDateRange(filters.datePreset, filters.dateFrom, filters.dateTo);
  const targetDept = norm(filters.departmentName || filters.departmentId);
  const targetStatus = norm(filters.status);
  const targetCat = norm(filters.category);
  const targetCrit = norm(filters.criticality || filters.priority);
  const targetType = norm(filters.maintenanceType);
  const targetEng = norm(filters.engineerName || filters.engineerId);
  const targetVendor = norm(filters.vendor);
  const targetRole = norm(filters.role);
  const query = norm(filters.query);

  return records.filter((r) => {
    // 1. Text Query
    if (query) {
      const searchable = [
        r.id,
        r.title,
        r.subtitle,
        r.status,
        ...(r.cells || []),
        ...(r.meta?.map((m) => `${m.label} ${m.value}`) || []),
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    // 2. Department
    if (targetDept && targetDept !== "all" && targetDept !== "all departments") {
      const rDept = [
        r.subtitle,
        r.cells?.[0],
        r.cells?.[1],
        r.meta?.find((m) => /dept|department/i.test(m.label))?.value,
        r.values?.department,
        r.values?.dept,
      ]
        .filter(Boolean)
        .join(" ");

      if (!fuzzyMatchText(rDept, targetDept)) return false;
    }

    // 3. Status
    if (targetStatus && targetStatus !== "all" && targetStatus !== "all statuses") {
      const rStatus = r.status;
      if (!fuzzyMatchText(rStatus, targetStatus)) return false;
    }

    // 4. Category
    if (targetCat && targetCat !== "all" && targetCat !== "all categories") {
      const rCat = [
        r.subtitle,
        r.title,
        r.cells?.[0],
        r.cells?.[1],
        r.meta?.find((m) => /category|type/i.test(m.label))?.value,
        r.values?.category,
      ]
        .filter(Boolean)
        .join(" ");

      if (!fuzzyMatchText(rCat, targetCat)) return false;
    }

    // 5. Criticality / Priority
    if (targetCrit && targetCrit !== "all" && targetCrit !== "all priorities") {
      const rCrit = [
        r.meta?.find((m) => /criticality|priority/i.test(m.label))?.value,
        r.cells?.[2],
        r.cells?.[3],
        r.subtitle,
      ]
        .filter(Boolean)
        .join(" ");

      if (!fuzzyMatchText(rCrit, targetCrit)) return false;
    }

    // 6. Maintenance Type
    if (targetType && targetType !== "all" && targetType !== "all types") {
      const rType = [
        r.meta?.find((m) => /type|kind|nature/i.test(m.label))?.value,
        r.cells?.[0],
        r.cells?.[1],
        r.title,
      ]
        .filter(Boolean)
        .join(" ");

      if (!fuzzyMatchText(rType, targetType)) return false;
    }

    // 7. Engineer / Assignee
    if (targetEng && targetEng !== "all") {
      const rEng = [
        r.meta?.find((m) => /engineer|assignee|technician|staff|lead/i.test(m.label))?.value,
        r.timeline?.map((t) => t.who).join(" "),
        r.cells?.[2],
      ]
        .filter(Boolean)
        .join(" ");

      if (!fuzzyMatchText(rEng, targetEng)) return false;
    }

    // 8. Vendor
    if (targetVendor && targetVendor !== "all" && targetVendor !== "all vendors") {
      const rVen = [
        r.meta?.find((m) => /vendor|partner|supplier|manufacturer/i.test(m.label))?.value,
        r.title,
        r.subtitle,
      ]
        .filter(Boolean)
        .join(" ");

      if (!fuzzyMatchText(rVen, targetVendor)) return false;
    }

    // 9. Role
    if (targetRole && targetRole !== "all" && targetRole !== "all roles") {
      const rRole = [
        r.meta?.find((m) => /role|permission/i.test(m.label))?.value,
        r.subtitle,
        r.cells?.[1],
      ]
        .filter(Boolean)
        .join(" ");

      if (!fuzzyMatchText(rRole, targetRole)) return false;
    }

    // 10. Date Range (strictly check custom ranges; presets pace charts/KPIs)
    if (filters.datePreset === "custom" && (from || to)) {
      const rDate = extractRecordDate(r);
      if (rDate && !isDateInRange(rDate, from, to)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Filter generic equipment records array (used in /equipment or fallback datasets)
 */
export function filterEquipmentList(items: any[], filters: AnalyticsFilterState): any[] {
  const { from, to } = resolveDateRange(filters.datePreset, filters.dateFrom, filters.dateTo);
  const targetDept = norm(filters.departmentName || filters.departmentId);
  const targetStatus = norm(filters.status);
  const targetCat = norm(filters.category);
  const targetCrit = norm(filters.criticality);
  const targetVendor = norm(filters.vendor);
  const query = norm(filters.query);

  return items.filter((item) => {
    if (query) {
      const text = [item.id, item.name, item.dept, item.department, item.category, item.vendor]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!text.includes(query)) return false;
    }

    if (targetDept && targetDept !== "all" && targetDept !== "all departments") {
      const dept = item.dept || item.department || item.departmentId?.name || item.departmentId;
      if (!fuzzyMatchText(dept, targetDept)) return false;
    }

    if (targetStatus && targetStatus !== "all" && targetStatus !== "all statuses") {
      const status = item.status;
      if (!fuzzyMatchText(status, targetStatus)) return false;
    }

    if (targetCat && targetCat !== "all" && targetCat !== "all categories") {
      const cat = item.category;
      if (!fuzzyMatchText(cat, targetCat)) return false;
    }

    if (targetCrit && targetCrit !== "all" && targetCrit !== "all priorities") {
      const crit = item.criticality || item.riskClass;
      if (!fuzzyMatchText(crit, targetCrit)) return false;
    }

    if (targetVendor && targetVendor !== "all" && targetVendor !== "all vendors") {
      const ven = item.vendor;
      if (!fuzzyMatchText(ven, targetVendor)) return false;
    }

    // Only exclude equipment on custom date range filtering
    if (filters.datePreset === "custom" && (from || to)) {
      const dateVal =
        item.createdAt || item.installed || item.specs?.installed || item.specs?.lastService;
      if (dateVal && !isDateInRange(dateVal, from, to)) return false;
    }

    return true;
  });
}

/**
 * Recalculates stats/KPIs from filtered ModuleRecords
 */
export function recalculateModuleStats(
  moduleKey: string,
  filteredRecords: ModuleRecord[],
  originalStats: { label: string; value: string; delta: string }[],
): { label: string; value: string; delta: string }[] {
  if (filteredRecords.length === 0) {
    return [
      { label: "Active records", value: "0", delta: "0 matching" },
      { label: "Operational score", value: "0%", delta: "No data" },
      { label: "Open items", value: "0", delta: "0" },
      { label: "SLA compliance", value: "—", delta: "No data" },
    ];
  }

  const count = filteredRecords.length;
  const avgScore = Math.round(
    filteredRecords.reduce((acc, r) => acc + (r.score || 0), 0) / count,
  );
  const positiveTones = filteredRecords.filter(
    (r) => r.tone === "success" || r.status?.toLowerCase().includes("operational") || r.status?.toLowerCase().includes("active"),
  ).length;
  const operationalPct = Math.round((positiveTones / count) * 100);

  const attentionCount = filteredRecords.filter(
    (r) =>
      r.tone === "danger" ||
      r.tone === "warning" ||
      r.status?.toLowerCase().includes("critical") ||
      r.status?.toLowerCase().includes("open") ||
      r.status?.toLowerCase().includes("maintenance") ||
      r.status?.toLowerCase().includes("overdue"),
  ).length;

  return [
    {
      label: originalStats[0]?.label || "Total records",
      value: count.toLocaleString(),
      delta: `${operationalPct}% in good standing`,
    },
    {
      label: originalStats[1]?.label || "Health score",
      value: `${avgScore}%`,
      delta: `${positiveTones} healthy`,
    },
    {
      label: originalStats[2]?.label || "Requires attention",
      value: String(attentionCount),
      delta: attentionCount === 0 ? "Optimal" : `${attentionCount} items`,
    },
    {
      label: originalStats[3]?.label || "Availability index",
      value: `${operationalPct}%`,
      delta: "Filtered dataset",
    },
  ];
}

/**
 * Recalculates breakdown chart from filtered records
 */
export function recalculateBreakdown(
  filteredRecords: ModuleRecord[],
  defaultBreakdown: { name: string; value: number }[],
): { name: string; value: number }[] {
  if (filteredRecords.length === 0) {
    return defaultBreakdown.map((b) => ({ ...b, value: 0 }));
  }

  // Count by status or category
  const counts: Record<string, number> = {};
  filteredRecords.forEach((r) => {
    const key = r.status || "Other";
    counts[key] = (counts[key] || 0) + 1;
  });

  const keys = Object.keys(counts);
  if (keys.length > 0) {
    return keys.map((k) => ({
      name: k.charAt(0).toUpperCase() + k.slice(1),
      value: counts[k],
    }));
  }

  return defaultBreakdown;
}

/**
 * Filter monthly trend data according to date presets
 */
export function filterTrendData<T extends { month?: string; week?: string; day?: string }>(
  trend: T[],
  filters: AnalyticsFilterState,
): T[] {
  if (!trend || trend.length === 0) return [];
  const { datePreset } = filters;

  if (datePreset === "7d") {
    return trend.slice(-2);
  }
  if (datePreset === "30d" || datePreset === "this-month" || datePreset === "last-month") {
    return trend.slice(-4);
  }
  if (datePreset === "90d" || datePreset === "this-quarter") {
    return trend.slice(-5);
  }
  return trend;
}

/**
 * Calculates dynamic monthly health and uptime trajectory for Executive Equipment & Maintenance Analytics.
 * Adjusts health scores, availability, and incident rates based on all active filter dimensions.
 */
export function calculateExecutiveHealthTrend(
  baseTrend: { month: string; health: number; uptime: number; incidents: number }[],
  filters: AnalyticsFilterState,
  departments: { name: string; score?: number; uptime?: number; complaints?: number }[] = [],
): { month: string; health: number; uptime: number; incidents: number }[] {
  const sliced = filterTrendData(baseTrend, filters);

  const targetDept = filters.departmentName || filters.departmentId;
  const targetCat = filters.category;
  const targetStatus = filters.status;
  const targetPriority = filters.priority || filters.criticality;
  const targetType = filters.maintenanceType;

  let healthOffset = 0;
  let uptimeOffset = 0;
  let incidentMultiplier = 1.0;

  if (targetDept && targetDept !== "all") {
    const matchedDept = departments.find((d) => fuzzyMatchText(d.name, targetDept));
    if (matchedDept) {
      const baseAvg = 92;
      healthOffset = (matchedDept.score || baseAvg) - baseAvg;
      uptimeOffset = matchedDept.uptime ? matchedDept.uptime - 98.0 : 0;
      incidentMultiplier = matchedDept.complaints ? matchedDept.complaints / 6.0 : 1.0;
    }
  }

  if (targetCat && targetCat !== "all") {
    const c = targetCat.toLowerCase();
    if (c.includes("imaging") || c.includes("diagnostic")) {
      healthOffset += 2;
      uptimeOffset += 0.8;
      incidentMultiplier *= 0.85;
    } else if (c.includes("life support") || c.includes("critical")) {
      healthOffset -= 4;
      uptimeOffset -= 0.5;
      incidentMultiplier *= 1.25;
    } else if (c.includes("surgical")) {
      healthOffset -= 2;
      incidentMultiplier *= 1.1;
    }
  }

  if (targetStatus && targetStatus !== "all") {
    const st = targetStatus.toLowerCase();
    if (st.includes("operational") || st.includes("active")) {
      healthOffset += 3;
      uptimeOffset += 1.2;
      incidentMultiplier *= 0.6;
    } else if (st.includes("maintenance") || st.includes("repair")) {
      healthOffset -= 12;
      uptimeOffset -= 4.5;
      incidentMultiplier *= 1.8;
    } else if (st.includes("critical") || st.includes("breakdown")) {
      healthOffset -= 22;
      uptimeOffset -= 8.0;
      incidentMultiplier *= 2.4;
    }
  }

  if (targetPriority && targetPriority !== "all") {
    const p = targetPriority.toLowerCase();
    if (p.includes("critical")) {
      incidentMultiplier *= 0.35;
    } else if (p.includes("high")) {
      incidentMultiplier *= 0.65;
    } else if (p.includes("low")) {
      incidentMultiplier *= 0.5;
    }
  }

  if (targetType && targetType !== "all") {
    const t = targetType.toLowerCase();
    if (t.includes("preventive")) {
      incidentMultiplier = 1.4;
    } else if (t.includes("corrective")) {
      incidentMultiplier = 0.8;
    } else if (t.includes("calibration")) {
      incidentMultiplier = 0.5;
    } else if (t.includes("emergency")) {
      incidentMultiplier = 0.25;
    }
  }

  return sliced.map((item, idx) => {
    const progression = (idx - sliced.length / 2) * 0.4;
    const computedHealth = Math.min(
      99,
      Math.max(60, Math.round(item.health + healthOffset + progression)),
    );
    const computedUptime = Math.min(
      100,
      Math.max(80, Number((item.uptime + uptimeOffset).toFixed(1))),
    );
    const computedIncidents = Math.max(1, Math.round(item.incidents * incidentMultiplier));

    return {
      ...item,
      health: computedHealth,
      uptime: computedUptime,
      incidents: computedIncidents,
    };
  });
}

/**
 * Calculates dynamic weekly complaint velocity for Complaint Analytics.
 * Adjusts daily raised and resolved volumes across department, category, priority, and status filters.
 */
export function calculateExecutiveComplaintFlow(
  baseFlow: { day: string; raised: number; resolved: number }[],
  filters: AnalyticsFilterState,
  departments: { name: string; complaints?: number }[] = [],
): { day: string; raised: number; resolved: number }[] {
  let sliced = [...baseFlow];
  if (filters.datePreset === "7d") {
    sliced = sliced.slice(-4);
  }

  const targetDept = filters.departmentName || filters.departmentId;
  const targetCat = filters.category;
  const targetStatus = filters.status;
  const targetPriority = filters.priority || filters.criticality;

  let multiplier = 1.0;
  let resolutionBias = 1.0;

  if (targetDept && targetDept !== "all") {
    const d = departments.find((dept) => fuzzyMatchText(dept.name, targetDept));
    if (d && typeof d.complaints === "number") {
      multiplier = d.complaints / 6.0;
    }
  }

  if (targetCat && targetCat !== "all") {
    const c = targetCat.toLowerCase();
    if (c.includes("imaging")) multiplier *= 0.6;
    else if (c.includes("emergency") || c.includes("life support")) multiplier *= 1.35;
    else if (c.includes("surgical")) multiplier *= 0.9;
  }

  if (targetPriority && targetPriority !== "all") {
    const p = targetPriority.toLowerCase();
    if (p.includes("critical")) multiplier *= 0.25;
    else if (p.includes("high")) multiplier *= 0.55;
    else if (p.includes("low")) multiplier *= 0.4;
  }

  if (targetStatus && targetStatus !== "all") {
    const st = targetStatus.toLowerCase();
    if (st.includes("resolved") || st.includes("closed")) {
      resolutionBias = 1.5;
      multiplier *= 0.7;
    } else if (st.includes("progress") || st.includes("open") || st.includes("triage")) {
      resolutionBias = 0.6;
      multiplier *= 1.2;
    }
  }

  return sliced.map((item) => ({
    day: item.day,
    raised: Math.max(1, Math.round(item.raised * multiplier)),
    resolved: Math.max(1, Math.round(item.resolved * multiplier * resolutionBias)),
  }));
}

export interface ExecutiveDepartmentBar {
  name: string;
  score: number;
  assets?: number;
  complaints?: number;
  uptime?: number;
  highlight?: boolean;
}

/**
 * Calculates dynamic department ranking for Department Analytics.
 * If a specific department is chosen, displays that department's multi-pillar operational scorecard.
 * If categories or statuses are filtered, re-ranks and scores departments accordingly.
 */
export function calculateExecutiveDepartmentRanking(
  baseDepartments: {
    name: string;
    score: number;
    assets?: number;
    complaints?: number;
    uptime?: number;
  }[],
  filters: AnalyticsFilterState,
): ExecutiveDepartmentBar[] {
  const targetDept = filters.departmentName || filters.departmentId;
  const targetCat = filters.category;
  const targetStatus = filters.status;
  const targetPriority = filters.priority || filters.criticality;

  // Case 1: When a specific department IS selected, provide a full pillar drill-down
  if (targetDept && targetDept !== "all") {
    const matched = baseDepartments.find((d) => fuzzyMatchText(d.name, targetDept));
    const baseScore = matched?.score || 92;
    const uptime = matched?.uptime || 98.5;

    return [
      { name: "Equipment Health", score: baseScore, highlight: true },
      { name: "Clinical Availability", score: Math.round(uptime), highlight: true },
      { name: "PPM Compliance", score: Math.min(99, baseScore + 2), highlight: true },
      { name: "Service Speed SLA", score: Math.max(75, baseScore - 3), highlight: true },
      { name: "Safety & Calibration", score: Math.min(98, baseScore + 3), highlight: true },
      { name: "Hospital Benchmark", score: 90, highlight: false },
    ];
  }

  // Case 2: Multi-department ranking with dynamic category & status re-weighting
  return baseDepartments
    .map((dept) => {
      let scoreMod = 0;

      if (targetCat && targetCat !== "all") {
        const c = targetCat.toLowerCase();
        if (c.includes("imaging")) {
          if (fuzzyMatchText(dept.name, "Radiology")) scoreMod += 4;
          else if (fuzzyMatchText(dept.name, "Cardiology")) scoreMod += 2;
          else scoreMod -= 2;
        } else if (c.includes("life support") || c.includes("critical")) {
          if (fuzzyMatchText(dept.name, "ICU")) scoreMod += 3;
          else if (fuzzyMatchText(dept.name, "Emergency")) scoreMod -= 3;
        } else if (c.includes("surgical")) {
          if (fuzzyMatchText(dept.name, "Operating Theatre")) scoreMod += 5;
          else scoreMod -= 2;
        }
      }

      if (targetStatus && targetStatus !== "all") {
        const st = targetStatus.toLowerCase();
        if (st.includes("operational")) {
          scoreMod += Math.round(((dept.uptime || 98) - 97) * 2);
        } else if (st.includes("maintenance") || st.includes("critical")) {
          scoreMod -= (dept.complaints || 5) * 1.5;
        }
      }

      if (targetPriority && targetPriority !== "all") {
        if (targetPriority.toLowerCase().includes("critical")) {
          scoreMod -= dept.complaints || 4;
        }
      }

      const finalScore = Math.min(99, Math.max(68, Math.round(dept.score + scoreMod)));
      return {
        ...dept,
        score: finalScore,
      };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Calculates dynamic cost split across maintenance categories
 */
export function calculateExecutiveCostSplit(
  baseCostSplit: { name: string; value: number }[],
  filters: AnalyticsFilterState,
): { name: string; value: number }[] {
  const targetDept = filters.departmentName || filters.departmentId;
  const targetCat = filters.category;
  const targetType = filters.maintenanceType;

  let split = [...baseCostSplit];

  if (targetDept && targetDept !== "all") {
    const d = targetDept.toLowerCase();
    if (d.includes("radiology")) {
      split = [
        { name: "Vendor AMC", value: 36 },
        { name: "Preventive", value: 34 },
        { name: "Spare parts", value: 18 },
        { name: "Corrective", value: 12 },
      ];
    } else if (d.includes("operating") || d.includes("theatre") || d.includes("surgical")) {
      split = [
        { name: "Corrective", value: 38 },
        { name: "Preventive", value: 32 },
        { name: "Spare parts", value: 20 },
        { name: "Vendor AMC", value: 10 },
      ];
    } else if (d.includes("icu") || d.includes("emergency")) {
      split = [
        { name: "Spare parts", value: 34 },
        { name: "Preventive", value: 30 },
        { name: "Corrective", value: 24 },
        { name: "Vendor AMC", value: 12 },
      ];
    }
  } else if (targetCat && targetCat !== "all") {
    const c = targetCat.toLowerCase();
    if (c.includes("imaging")) {
      split = [
        { name: "Vendor AMC", value: 44 },
        { name: "Preventive", value: 28 },
        { name: "Spare parts", value: 18 },
        { name: "Corrective", value: 10 },
      ];
    } else if (c.includes("surgical")) {
      split = [
        { name: "Corrective", value: 40 },
        { name: "Preventive", value: 30 },
        { name: "Spare parts", value: 20 },
        { name: "Vendor AMC", value: 10 },
      ];
    }
  }

  if (targetType && targetType !== "all") {
    const t = targetType.toLowerCase();
    const match = split.find((s) => s.name.toLowerCase().includes(t));
    if (match) {
      const remainingVal = 100 - 55;
      const others = split.filter((s) => s !== match);
      const otherTotal = others.reduce((acc, o) => acc + o.value, 0) || 1;
      return [
        { name: match.name, value: 55 },
        ...others.map((o) => ({
          name: o.name,
          value: Math.round((o.value / otherTotal) * remainingVal),
        })),
      ];
    }
  }

  return split;
}
