import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { departmentsApi } from "./departmentsApi";
import { toDepartmentRecord } from "./departmentRecords";
import type { ApiDepartment, ApiEquipment, ApiComplaint, ApiWorkOrder, ApiUser } from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

/** Department register backed by MongoDB. Idle when VITE_API_URL is unset. */
export function useDepartmentList() {
  const [items, setItems] = useState<ApiDepartment[] | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    departmentsApi
      .list()
      .then((res) => {
        if (cancelled) return;
        setItems(res);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load departments.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const records: ModuleRecord[] | null = items ? items.map((d) => toDepartmentRecord(d)) : null;
  return { enabled: apiEnabled, items, records, total: items?.length ?? 0, loading, error, reload };
}

export type DepartmentDetail = {
  department: ApiDepartment;
  equipment: ApiEquipment[];
  complaints: ApiComplaint[];
  maintenance: ApiWorkOrder[];
};

export function useDepartmentRecord(id: string) {
  const [detail, setDetail] = useState<DepartmentDetail | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      departmentsApi.get(id),
      departmentsApi.equipment(id).catch(() => [] as ApiEquipment[]),
      departmentsApi.complaints(id).catch(() => [] as ApiComplaint[]),
      departmentsApi.maintenance(id).catch(() => [] as ApiWorkOrder[]),
    ])
      .then(([dept, equipment, complaints, maintenance]) => {
        if (cancelled) return;
        setDetail({ department: dept, equipment, complaints, maintenance });
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load department details.")))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record: ModuleRecord | null = detail
    ? toDepartmentRecord(
        detail.department,
        detail.equipment.length,
        0,
        detail.complaints.filter((c) => c.status !== "CLOSED" && c.status !== "RESOLVED").length,
      )
    : null;

  return {
    enabled: apiEnabled,
    detail,
    department: detail?.department ?? null,
    record,
    loading,
    error,
    reload,
  };
}

export function useDepartmentMutations() {
  const [saving, setSaving] = useState(false);

  const run = useCallback(async <T>(fn: () => Promise<T>) => {
    setSaving(true);
    try {
      return await fn();
    } finally {
      setSaving(false);
    }
  }, []);

  return {
    enabled: apiEnabled,
    saving,
    create: (payload: Partial<ApiDepartment>) => run(() => departmentsApi.create(payload)),
    update: (id: string, payload: Partial<ApiDepartment>) =>
      run(() => departmentsApi.update(id, payload)),
    remove: (id: string) => run(() => departmentsApi.remove(id)),
  };
}
