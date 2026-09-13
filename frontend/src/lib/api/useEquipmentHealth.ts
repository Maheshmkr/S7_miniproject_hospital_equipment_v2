import { useEffect, useState, useCallback } from "react";
import { get } from "./client";
import { apiEnabled } from "./client";

export type HealthBreakdownComponent = {
  score: number;
  max: number;
  normalized: number;
  weight: number;
  applicable: boolean;
};

export type EquipmentHealthData = {
  equipmentId: string;
  equipmentCode: string;
  name: string;
  category: string;
  healthScore: number;
  healthStatus: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "CRITICAL";
  calculatedScore: number;
  isCapped: boolean;
  capReason: string | null;
  breakdown: {
    operational: HealthBreakdownComponent;
    complaints: HealthBreakdownComponent;
    maintenance: HealthBreakdownComponent;
    preventiveMaintenance: HealthBreakdownComponent;
    calibration: HealthBreakdownComponent;
    warranty: HealthBreakdownComponent;
    safety: HealthBreakdownComponent;
  };
  metrics: {
    totalComplaints?: number;
    openComplaints?: number;
    openCriticalComplaints?: number;
    recent90DayComplaints?: number;
    totalWorkOrders?: number;
    completedWorkOrders?: number;
    totalMaintenance?: number;
    completedMaintenance?: number;
    overdueMaintenance?: number;
    totalPM?: number;
    completedPM?: number;
    overduePM?: number;
    totalCalibrations?: number;
    lastResult?: string;
    isOverdue?: boolean;
    hasActiveWarranty?: boolean;
    daysRemaining?: number | null;
    totalResponses?: number;
    passedResponses?: number;
    failedResponses?: number;
    criticalFailures?: number;
    passRate?: number;
    operationalStatus?: string;
    lifecycleStage?: string;
  };
};

export type EquipmentHealthSnapshotItem = {
  _id?: string;
  healthScore: number;
  healthStatus: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" | "CRITICAL";
  recordedAt: string;
  triggerEvent?: string;
  breakdown?: EquipmentHealthData["breakdown"];
  metrics?: EquipmentHealthData["metrics"];
};

export function useEquipmentHealthScore(id?: string) {
  const [data, setData] = useState<EquipmentHealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(apiEnabled && id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!apiEnabled || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await get<EquipmentHealthData>(`/equipment/${id}/health-score`);
      setData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch health score");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useEquipmentHealthHistory(id?: string, limit = 12) {
  const [history, setHistory] = useState<EquipmentHealthSnapshotItem[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(apiEnabled && id));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!apiEnabled || !id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await get<EquipmentHealthSnapshotItem[]>(`/equipment/${id}/health-history`, {
        limit,
      });
      setHistory(res || []);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch health history");
    } finally {
      setLoading(false);
    }
  }, [id, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { history, loading, error, refresh };
}
