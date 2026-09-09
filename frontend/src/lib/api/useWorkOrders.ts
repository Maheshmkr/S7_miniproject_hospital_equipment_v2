import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { workOrdersApi } from "./workOrdersApi";
import { equipmentApi } from "./equipmentApi";
import { usersApi } from "./usersApi";
import { toWorkOrderPayload, toWorkOrderRecord } from "./workOrderRecords";
import type { ApiWorkOrder } from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

export type WorkOrderQuery = {
  status?: string;
  priority?: string;
  departmentId?: string;
  equipmentId?: string;
  complaintId?: string;
  engineerId?: string;
  maintenanceType?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

/** Work order register backed by MongoDB. Idle when VITE_API_URL is unset. */
export function useWorkOrderList(query: WorkOrderQuery = {}) {
  const [items, setItems] = useState<ApiWorkOrder[] | null>(null);
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
    workOrdersApi
      .list(JSON.parse(key) as WorkOrderQuery)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load work orders.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: ModuleRecord[] | null = useMemo(
    () => (items ? items.map(toWorkOrderRecord) : null),
    [items],
  );

  return { enabled: apiEnabled, items, records, total, loading, error, reload };
}

export function useWorkOrderRecord(id: string) {
  const [item, setItem] = useState<ApiWorkOrder | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    workOrdersApi
      .get(id)
      .then((ctx) => !cancelled && setItem(ctx.workOrder))
      .catch((err) => !cancelled && setError(message(err, "Unable to load this work order.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record = useMemo(() => (item ? toWorkOrderRecord(item) : null), [item]);
  return { enabled: apiEnabled, item, record, loading, error, reload };
}

/** Equipment name -> id and engineer name -> id so the existing name selects keep working. */
function useWorkOrderLookups() {
  const [equipmentByName, setEquipmentByName] = useState<Record<string, string>>({});
  const [engineersByName, setEngineersByName] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    equipmentApi
      .list({ limit: 200 })
      .then((page) => {
        if (cancelled) return;
        const byEquip: Record<string, string> = {};
        for (const e of page.items) {
          byEquip[e.name] = e._id;
          byEquip[e.equipmentId] = e._id;
          byEquip[`${e.equipmentId} — ${e.name}`] = e._id;
          byEquip[`${e.equipmentId} · ${e.name}`] = e._id;
          byEquip[e._id] = e._id;
        }
        setEquipmentByName(byEquip);
      })
      .catch(() => undefined);
    usersApi
      .list({ role: "BIOMEDICAL_ENGINEER" })
      .then((page) => {
        if (cancelled) return;
        const list = Array.isArray(page) ? page : page.items;
        const byEng: Record<string, string> = {};
        for (const u of list) {
          byEng[u.name] = u._id;
          byEng[u.name.trim()] = u._id;
          byEng[u.email] = u._id;
          byEng[u._id] = u._id;
        }
        setEngineersByName(byEng);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return { equipmentByName, engineersByName };
}

export function useWorkOrderMutations() {
  const lookups = useWorkOrderLookups();

  const create = useCallback(
    async (values: Record<string, string>, extra?: { complaintId?: string }) => {
      const { equipmentId, engineerId, ...rest } = toWorkOrderPayload(values, lookups);
      if (!equipmentId) throw new Error("Select an equipment record that exists in the register.");
      return workOrdersApi.create({
        ...rest,
        equipmentId,
        ...(engineerId ? { engineerId } : {}),
        ...(extra?.complaintId ? { complaintId: extra.complaintId } : {}),
      } as Parameters<typeof workOrdersApi.create>[0]);
    },
    [lookups],
  );

  const update = useCallback(
    async (id: string, values: Record<string, string>) => {
      const {
        engineerId,
        equipmentId: _equipmentId,
        ...rest
      } = toWorkOrderPayload(values, lookups);
      const saved = await workOrdersApi.update(id, rest as Partial<ApiWorkOrder>);
      if (engineerId) await workOrdersApi.assign(id, engineerId);
      return saved;
    },
    [lookups],
  );

  const remove = useCallback((id: string) => workOrdersApi.remove(id), []);
  const assign = useCallback(
    (id: string, engineerId: string) => workOrdersApi.assign(id, engineerId),
    [],
  );
  const setStatus = useCallback(
    (id: string, status: ApiWorkOrder["status"]) => workOrdersApi.setStatus(id, status),
    [],
  );

  return { create, update, remove, assign, setStatus };
}
