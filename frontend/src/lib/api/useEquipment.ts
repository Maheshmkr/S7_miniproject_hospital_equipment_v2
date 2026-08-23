import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { equipmentApi, type EquipmentQuery } from "./equipmentApi";
import { departmentsApi } from "./departmentsApi";
import { toEquipmentRecord, toEquipmentPayload } from "./equipmentRecords";
import type { ApiEquipment } from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

/** Equipment register backed by MongoDB. Idle (and null) when VITE_API_URL is unset. */
export function useEquipmentList(query: EquipmentQuery = {}) {
  const [items, setItems] = useState<ApiEquipment[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    equipmentApi
      .list(JSON.parse(key) as EquipmentQuery)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load equipment.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: ModuleRecord[] | null = useMemo(
    () => (items ? items.map(toEquipmentRecord) : null),
    [items],
  );

  return { enabled: apiEnabled, items, records, total, loading, error, reload };
}

export function useEquipmentRecord(id: string) {
  const [item, setItem] = useState<ApiEquipment | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    equipmentApi
      .get(id)
      .then((data) => !cancelled && setItem(data))
      .catch((err) => !cancelled && setError(message(err, "Unable to load this asset.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const record = useMemo(() => (item ? toEquipmentRecord(item) : null), [item]);
  return { enabled: apiEnabled, item, record, loading, error };
}

/** Department name -> id lookup so the existing name-based select keeps working. */
export function useDepartmentLookup() {
  const [byName, setByName] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    departmentsApi
      .list()
      .then((list) => {
        if (cancelled) return;
        setByName(Object.fromEntries(list.map((d) => [d.name, d._id])));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return byName;
}

export function useEquipmentMutations() {
  const departmentsByName = useDepartmentLookup();

  const create = useCallback(
    (values: Record<string, string>) =>
      equipmentApi.create(toEquipmentPayload(values, departmentsByName)),
    [departmentsByName],
  );
  const update = useCallback(
    (id: string, values: Record<string, string>) =>
      equipmentApi.update(id, toEquipmentPayload(values, departmentsByName)),
    [departmentsByName],
  );
  const remove = useCallback((id: string) => equipmentApi.remove(id), []);

  return { create, update, remove };
}
