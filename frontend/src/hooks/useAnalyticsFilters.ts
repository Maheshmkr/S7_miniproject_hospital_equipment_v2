import { useCallback, useEffect, useMemo, useState } from "react";
import {
  type AnalyticsFilterState,
  type DatePreset,
  DEFAULT_ANALYTICS_FILTERS,
  resolveDateRange,
} from "@/lib/analyticsFilterEngine";
import type { AnalyticsFilter } from "@/lib/api/analyticsApi";

const STORAGE_PREFIX = "medixa_analytics_filters_v2";

function getStorageKey(): string {
  if (typeof window === "undefined") return `${STORAGE_PREFIX}_global`;
  // Scope by module or base route path so engineer performance doesn't clobber module filters
  const pathPart = window.location.pathname.split("/").filter(Boolean)[0] || "analytics";
  return `${STORAGE_PREFIX}_${pathPart}`;
}

/**
 * Parses URL search string or fallback session storage into filter state
 */
function readInitialFilters(defaultPreset: DatePreset = "all"): AnalyticsFilterState {
  if (typeof window === "undefined") {
    return { ...DEFAULT_ANALYTICS_FILTERS, datePreset: defaultPreset };
  }

  const storageKey = getStorageKey();
  const params = new URLSearchParams(window.location.search);
  const storedStr = sessionStorage.getItem(storageKey);
  let stored: Partial<AnalyticsFilterState> = {};
  if (storedStr) {
    try {
      stored = JSON.parse(storedStr);
    } catch {
      // ignore
    }
  }

  // URL parameters take highest priority, then sessionStorage, then defaults
  const rawPreset = params.get("dateRange") || params.get("preset") || stored.datePreset;
  const datePreset = (rawPreset && rawPreset !== "30d" ? rawPreset : defaultPreset) as DatePreset;

  const dateFrom = params.get("dateFrom") || params.get("from") || stored.dateFrom || undefined;
  const dateTo = params.get("dateTo") || params.get("to") || stored.dateTo || undefined;
  const departmentId =
    params.get("departmentId") || params.get("deptId") || stored.departmentId || undefined;
  const departmentName =
    params.get("department") || params.get("dept") || stored.departmentName || undefined;
  const status = params.get("status") || stored.status || undefined;
  const category = params.get("category") || stored.category || undefined;
  const criticality = params.get("criticality") || stored.criticality || undefined;
  const priority = params.get("priority") || stored.priority || undefined;
  const maintenanceType =
    params.get("maintenanceType") || params.get("type") || stored.maintenanceType || undefined;
  const engineerId = params.get("engineerId") || stored.engineerId || undefined;
  const engineerName =
    params.get("engineer") || params.get("assignee") || stored.engineerName || undefined;
  const vendor = params.get("vendor") || stored.vendor || undefined;
  const role = params.get("role") || stored.role || undefined;
  const query = params.get("q") || params.get("query") || undefined;

  return {
    datePreset,
    dateFrom,
    dateTo,
    departmentId,
    departmentName,
    status,
    category,
    criticality,
    priority,
    maintenanceType,
    engineerId,
    engineerName,
    vendor,
    role,
    query,
  };
}

/**
 * Synchronizes filter state to URL query params and sessionStorage
 */
function syncFiltersToUrl(state: AnalyticsFilterState) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);

  // Date range
  if (state.datePreset && state.datePreset !== "all") {
    params.set("preset", state.datePreset);
  } else {
    params.delete("preset");
    params.delete("dateRange");
  }

  if (state.datePreset === "custom") {
    if (state.dateFrom) params.set("from", state.dateFrom);
    else params.delete("from");
    if (state.dateTo) params.set("to", state.dateTo);
    else params.delete("to");
  } else {
    params.delete("from");
    params.delete("to");
    params.delete("dateFrom");
    params.delete("dateTo");
  }

  // Dimension filters
  const keys: (keyof AnalyticsFilterState)[] = [
    "departmentId",
    "departmentName",
    "status",
    "category",
    "criticality",
    "priority",
    "maintenanceType",
    "engineerId",
    "engineerName",
    "vendor",
    "role",
    "query",
  ];

  keys.forEach((k) => {
    const val = state[k];
    if (val && val !== "all") {
      params.set(k === "departmentName" ? "dept" : k === "query" ? "q" : k, val);
    } else {
      params.delete(k === "departmentName" ? "dept" : k === "query" ? "q" : k);
    }
  });

  const queryStr = params.toString();
  const newRelativePathQuery =
    window.location.pathname + (queryStr ? `?${queryStr}` : "") + window.location.hash;
  window.history.replaceState(null, "", newRelativePathQuery);

  // Persist into route-scoped sessionStorage
  try {
    sessionStorage.setItem(getStorageKey(), JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useAnalyticsFilters(defaultPreset: DatePreset = "all") {
  const [filters, setFiltersState] = useState<AnalyticsFilterState>(() =>
    readInitialFilters(defaultPreset),
  );

  const updateFilter = useCallback((key: keyof AnalyticsFilterState, value: string | undefined) => {
    setFiltersState((prev) => {
      const cleanVal = !value || value === "all" || value === "All" ? undefined : value;
      const next = { ...prev, [key]: cleanVal };
      syncFiltersToUrl(next);
      return next;
    });
  }, []);

  const setDatePreset = useCallback(
    (preset: DatePreset, customFrom?: string, customTo?: string) => {
      setFiltersState((prev) => {
        const next: AnalyticsFilterState = {
          ...prev,
          datePreset: preset,
          dateFrom: preset === "custom" ? customFrom : undefined,
          dateTo: preset === "custom" ? customTo : undefined,
        };
        syncFiltersToUrl(next);
        return next;
      });
    },
    [],
  );

  const clearAll = useCallback(() => {
    setFiltersState(() => {
      const reset = { ...DEFAULT_ANALYTICS_FILTERS, datePreset: defaultPreset };
      syncFiltersToUrl(reset);
      return reset;
    });
  }, [defaultPreset]);

  const removeFilter = useCallback(
    (key: keyof AnalyticsFilterState) => {
      setFiltersState((prev) => {
        const next = { ...prev };
        if (key === "datePreset" || key === "dateFrom" || key === "dateTo") {
          next.datePreset = defaultPreset;
          next.dateFrom = undefined;
          next.dateTo = undefined;
        } else {
          next[key] = undefined;
        }
        syncFiltersToUrl(next);
        return next;
      });
    },
    [defaultPreset],
  );

  // Compute concrete dates & human label
  const resolvedDate = useMemo(
    () => resolveDateRange(filters.datePreset, filters.dateFrom, filters.dateTo),
    [filters.datePreset, filters.dateFrom, filters.dateTo],
  );

  // Prepare standard API filter object
  const apiFilter: AnalyticsFilter = useMemo(() => {
    return {
      dateFrom: resolvedDate.from,
      dateTo: resolvedDate.to,
      from: resolvedDate.from,
      to: resolvedDate.to,
      departmentId: filters.departmentId,
      status: filters.status,
      category: filters.category,
      criticality: filters.criticality,
      priority: filters.priority,
      maintenanceType: filters.maintenanceType,
      engineerId: filters.engineerId,
    };
  }, [resolvedDate, filters]);

  // Compute active pills for UI
  const activePills = useMemo(() => {
    const pills: {
      key: keyof AnalyticsFilterState;
      label: string;
      value: string;
      onRemove: () => void;
    }[] = [];

    if (filters.datePreset !== "all") {
      pills.push({
        key: "datePreset",
        label: "Date",
        value: resolvedDate.label,
        onRemove: () => removeFilter("datePreset"),
      });
    }

    if (filters.departmentName || filters.departmentId) {
      pills.push({
        key: "departmentName",
        label: "Department",
        value: filters.departmentName || filters.departmentId || "",
        onRemove: () => removeFilter("departmentName"),
      });
    }

    if (filters.status && filters.status !== "all") {
      pills.push({
        key: "status",
        label: "Status",
        value: filters.status,
        onRemove: () => removeFilter("status"),
      });
    }

    if (filters.category && filters.category !== "all") {
      pills.push({
        key: "category",
        label: "Category",
        value: filters.category,
        onRemove: () => removeFilter("category"),
      });
    }

    if (filters.criticality && filters.criticality !== "all") {
      pills.push({
        key: "criticality",
        label: "Criticality",
        value: filters.criticality,
        onRemove: () => removeFilter("criticality"),
      });
    }

    if (filters.priority && filters.priority !== "all") {
      pills.push({
        key: "priority",
        label: "Priority",
        value: filters.priority,
        onRemove: () => removeFilter("priority"),
      });
    }

    if (filters.maintenanceType && filters.maintenanceType !== "all") {
      pills.push({
        key: "maintenanceType",
        label: "Type",
        value: filters.maintenanceType,
        onRemove: () => removeFilter("maintenanceType"),
      });
    }

    if (filters.engineerName || filters.engineerId) {
      pills.push({
        key: "engineerName",
        label: "Engineer",
        value: filters.engineerName || filters.engineerId || "",
        onRemove: () => removeFilter("engineerName"),
      });
    }

    if (filters.vendor && filters.vendor !== "all") {
      pills.push({
        key: "vendor",
        label: "Vendor",
        value: filters.vendor,
        onRemove: () => removeFilter("vendor"),
      });
    }

    if (filters.role && filters.role !== "all") {
      pills.push({
        key: "role",
        label: "Role",
        value: filters.role,
        onRemove: () => removeFilter("role"),
      });
    }

    if (filters.query) {
      pills.push({
        key: "query",
        label: "Search",
        value: `"${filters.query}"`,
        onRemove: () => removeFilter("query"),
      });
    }

    return pills;
  }, [filters, resolvedDate, removeFilter]);

  const activeFilterCount = activePills.length;

  // Active filter metadata dictionary for exports
  const exportMetadata = useMemo(() => {
    const meta: Record<string, string> = {
      "Date Range": resolvedDate.label,
    };
    if (filters.departmentName || filters.departmentId) {
      meta["Department"] = filters.departmentName || filters.departmentId || "All";
    }
    if (filters.status) meta["Status"] = filters.status;
    if (filters.category) meta["Category"] = filters.category;
    if (filters.criticality) meta["Criticality"] = filters.criticality;
    if (filters.priority) meta["Priority"] = filters.priority;
    if (filters.maintenanceType) meta["Maintenance Type"] = filters.maintenanceType;
    if (filters.engineerName || filters.engineerId) {
      meta["Assigned Engineer"] = filters.engineerName || filters.engineerId || "";
    }
    if (filters.vendor) meta["Vendor"] = filters.vendor;
    if (filters.role) meta["Role"] = filters.role;
    if (filters.query) meta["Search Query"] = filters.query;
    return meta;
  }, [filters, resolvedDate]);

  return {
    filters,
    apiFilter,
    dateRangeLabel: resolvedDate.label,
    dateFrom: resolvedDate.from,
    dateTo: resolvedDate.to,
    activeFilterCount,
    activePills,
    exportMetadata,
    updateFilter,
    setDatePreset,
    clearAll,
    removeFilter,
  };
}
