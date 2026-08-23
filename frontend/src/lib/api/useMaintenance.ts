import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { maintenanceApi, type MaintenanceQuery, type MaintenanceStats } from "./maintenanceApi";
import { toStaffMaintenance } from "./maintenanceRecords";
import type { ApiAuditLog, ApiMaintenance } from "./types";
import type { StaffMaintenance } from "@/lib/staff";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

/** Maintenance register backed by MongoDB. Idle when VITE_API_URL is unset. */
export function useMaintenanceList(query: MaintenanceQuery = {}) {
  const [items, setItems] = useState<ApiMaintenance[] | null>(null);
  const [stats, setStats] = useState<MaintenanceStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    const params = JSON.parse(key) as MaintenanceQuery;
    setLoading(true);
    setError(null);
    Promise.all([maintenanceApi.list(params), maintenanceApi.stats(params).catch(() => null)])
      .then(([page, summary]) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setStats(summary);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load maintenance records.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: StaffMaintenance[] | null = useMemo(
    () => (items ? items.map(toStaffMaintenance) : null),
    [items],
  );

  return { enabled: apiEnabled, items, records, stats, total, loading, error, reload };
}

export function useMaintenanceRecord(id: string) {
  const [item, setItem] = useState<ApiMaintenance | null>(null);
  const [history, setHistory] = useState<ApiAuditLog[]>([]);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([maintenanceApi.get(id), maintenanceApi.history(id).catch(() => [])])
      .then(([detail, log]) => {
        if (cancelled) return;
        setItem(detail.maintenance);
        setHistory(log);
      })
      .catch(
        (err) => !cancelled && setError(message(err, "Unable to load this maintenance record.")),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record = useMemo(() => (item ? toStaffMaintenance(item) : null), [item]);
  return { enabled: apiEnabled, item, record, history, loading, error, reload };
}

export function useMaintenanceMutations() {
  const create = useCallback(
    (payload: Parameters<typeof maintenanceApi.create>[0]) => maintenanceApi.create(payload),
    [],
  );
  const update = useCallback(
    (id: string, payload: Partial<ApiMaintenance>) => maintenanceApi.update(id, payload),
    [],
  );
  const setStatus = useCallback(
    (id: string, status: ApiMaintenance["status"]) => maintenanceApi.setStatus(id, status),
    [],
  );
  const assign = useCallback(
    (id: string, engineerId: string) => maintenanceApi.assign(id, engineerId),
    [],
  );
  const remove = useCallback((id: string) => maintenanceApi.remove(id), []);
  return { create, update, setStatus, assign, remove };
}
