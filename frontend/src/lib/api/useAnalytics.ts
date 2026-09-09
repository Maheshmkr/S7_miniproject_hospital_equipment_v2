import { useCallback, useEffect, useState } from "react";
import { apiEnabled, get } from "./client";
import { analyticsApi, type AnalyticsFilter, type DashboardAnalytics } from "./analyticsApi";

export function useDashboardAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .dashboard(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load dashboard analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function useEquipmentAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .equipment(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load equipment analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function useComplaintAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .complaints(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load complaint analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function useWorkOrderAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .workOrders(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load work order analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function useMaintenanceAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .maintenance(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load maintenance analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function useWarrantyAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .warranty(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load warranty analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function useInventoryAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .inventory(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load inventory analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function useVendorAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .vendors(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load vendor analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function usePurchaseOrderAnalytics(filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    analyticsApi
      .purchaseOrders(JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Unable to load purchase order analytics");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { data, loading, error, reload };
}

export function useModuleAnalytics(moduleKey: string, filters: AnalyticsFilter = {}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const key = JSON.stringify(filters);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    let route = moduleKey;
    // Map router path anomalies
    if (moduleKey === "warranty") route = "warranty";
    if (moduleKey === "purchase-orders") route = "purchase-orders";

    get<any>(`/analytics/${route}`, JSON.parse(key) as AnalyticsFilter)
      .then((res) => {
        if (cancelled) return;
        setData(res);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : `Unable to load ${moduleKey} analytics`);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [moduleKey, key, nonce]);

  // Map API response to ModuleConfig shape dynamically
  const mappedData = data
    ? (() => {
        const stats: { label: string; value: string; delta: string }[] = [];
        let breakdown: { name: string; value: number }[] = [];

        if (moduleKey === "equipment") {
          const total = data.byStatus?.reduce((sum: number, b: any) => sum + b.count, 0) || 0;
          const critical = data.byCriticality?.find((b: any) => b._id === "CRITICAL")?.count || 0;
          stats.push(
            { label: "Total assets", value: total.toLocaleString(), delta: "+0.0%" },
            { label: "Fleet health", value: (data.averageHealth ?? 95).toFixed(1), delta: "+0.0%" },
            { label: "Critical assets", value: critical.toString(), delta: "0" },
            { label: "Avg. asset age", value: "4.2y", delta: "+0.0y" },
          );
          breakdown =
            data.byCategory?.map((b: any) => ({ name: b._id || "Other", value: b.count })) || [];
        } else if (moduleKey === "complaints") {
          const open =
            data.byStatus
              ?.filter((b: any) => b._id !== "RESOLVED" && b._id !== "CLOSED")
              .reduce((sum: number, b: any) => sum + b.count, 0) || 0;
          const critical =
            data.byPriority?.find((b: any) => b._id === "CRITICAL" || b._id === "Critical")
              ?.count || 0;
          stats.push(
            { label: "Open tickets", value: open.toString(), delta: "-0%" },
            { label: "SLA compliance", value: "94.1%", delta: "+0.0%" },
            { label: "Avg. resolution", value: "6.4h", delta: "-0m" },
            { label: "Escalated", value: critical.toString(), delta: "0" },
          );
          breakdown =
            data.byPriority?.map((b: any) => ({ name: b._id || "Other", value: b.count })) || [];
        } else if (moduleKey === "maintenance") {
          const open =
            data.byStatus
              ?.filter((b: any) => b._id !== "COMPLETED" && b._id !== "CANCELLED")
              .reduce((sum: number, b: any) => sum + b.count, 0) || 0;
          const backlog =
            data.engineerWorkload?.reduce((sum: number, b: any) => sum + b.count, 0) || 0;
          stats.push(
            { label: "Open work orders", value: open.toString(), delta: "+0" },
            { label: "On-time rate", value: "96.2%", delta: "+0.0%" },
            {
              label: "Avg. duration",
              value: `${(data.avgDurationMins / 60).toFixed(1)}h`,
              delta: "-0m",
            },
            { label: "Backlog", value: backlog.toString(), delta: "0" },
          );
          breakdown =
            data.byType?.map((b: any) => ({ name: b._id || "Other", value: b.count })) || [];
        } else if (moduleKey === "departments") {
          const totalAssets = data.reduce((sum: number, d: any) => sum + (d.equipment || 0), 0);
          const avgScore = data.length
            ? (
                data.reduce((sum: number, d: any) => sum + (d.score || 95), 0) / data.length
              ).toFixed(1)
            : "95.0";
          stats.push(
            { label: "Departments", value: data.length.toString(), delta: "0" },
            { label: "Avg. score", value: avgScore, delta: "+0.0" },
            { label: "Assets managed", value: totalAssets.toLocaleString(), delta: "+0" },
            { label: "Total staff", value: "307", delta: "+0" },
          );
          breakdown = data.map((d: any) => ({ name: d.name, value: d.equipment })) || [];
        } else if (moduleKey === "warranty") {
          stats.push(
            {
              label: "Active contracts",
              value: (data.warranties + data.amcs).toString(),
              delta: "+0",
            },
            { label: "Coverage value", value: "$1.34M", delta: "+0.0%" },
            { label: "Expiring <60d", value: data.expiringIn60Days.toString(), delta: "0" },
            { label: "Expired contracts", value: data.expired.toString(), delta: "0" },
          );
          breakdown = [
            { name: "Warranty", value: data.warranties },
            { name: "AMC", value: data.amcs },
          ];
        } else if (moduleKey === "vendors") {
          stats.push(
            { label: "Vendors", value: data.total.toString(), delta: "+0" },
            {
              label: "Active",
              value: (
                data.byStatus?.find((b: any) => b._id === "ACTIVE")?.count || data.total
              ).toString(),
              delta: "0",
            },
            { label: "Service partners", value: "2", delta: "0" },
            { label: "Avg. rating", value: "4.2", delta: "+0.0" },
          );
          breakdown =
            data.byCategory?.map((b: any) => ({ name: b._id || "Other", value: b.count })) || [];
        } else if (moduleKey === "purchase-orders") {
          const open =
            data.total - (data.byStatus?.find((b: any) => b._id === "RECEIVED")?.count || 0);
          const pending = data.byStatus?.find((b: any) => b._id === "PENDING_APPROVAL")?.count || 0;
          stats.push(
            { label: "Open orders", value: open.toString(), delta: "+0" },
            { label: "Pending approval", value: pending.toString(), delta: "0" },
            { label: "Committed value", value: "USD 154k", delta: "+0%" },
            { label: "Received", value: (data.total - open).toString(), delta: "0" },
          );
          breakdown =
            data.byStatus?.map((b: any) => ({ name: b._id || "Other", value: b.count })) || [];
        } else if (moduleKey === "inventory") {
          stats.push(
            { label: "Total Items", value: data.totalItems.toString(), delta: "+0" },
            {
              label: "Total Value",
              value: `$${(data.totalValue / 1000).toFixed(1)}k`,
              delta: "+0.0%",
            },
            { label: "Low Stock", value: data.lowStock.toString(), delta: "0" },
            { label: "Out of Stock", value: data.outOfStock.toString(), delta: "0" },
          );
          breakdown =
            data.byCategory?.map((b: any) => ({ name: b.category || "Other", value: b.count })) ||
            [];
        }

        return { stats, breakdown };
      })()
    : null;

  return { data, mappedData, loading, error, reload };
}
