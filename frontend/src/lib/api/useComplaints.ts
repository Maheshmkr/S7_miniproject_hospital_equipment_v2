import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { complaintsApi } from "./complaintsApi";
import { equipmentApi } from "./equipmentApi";
import { usersApi } from "./usersApi";
import { useDepartmentLookup } from "./useEquipment";
import { toComplaintPayload, toComplaintRecord } from "./complaintRecords";
import type { ApiComplaint } from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

export type ComplaintQuery = {
  status?: string;
  priority?: string;
  departmentId?: string;
  equipmentId?: string;
  engineerId?: string;
  reportedBy?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
};

/** Complaints register backed by MongoDB. Idle when VITE_API_URL is unset. */
export function useComplaintList(query: ComplaintQuery = {}) {
  const [items, setItems] = useState<ApiComplaint[] | null>(null);
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
    complaintsApi
      .list(JSON.parse(key) as ComplaintQuery)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load complaints.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: ModuleRecord[] | null = useMemo(
    () => (items ? items.map(toComplaintRecord) : null),
    [items],
  );

  return { enabled: apiEnabled, items, records, total, loading, error, reload };
}

export function useComplaintRecord(id: string) {
  const [item, setItem] = useState<ApiComplaint | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    complaintsApi
      .get(id)
      .then((data) => !cancelled && setItem(data))
      .catch((err) => !cancelled && setError(message(err, "Unable to load this complaint.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record = useMemo(() => (item ? toComplaintRecord(item) : null), [item]);
  return { enabled: apiEnabled, item, record, loading, error, reload };
}

/** Equipment name -> id and engineer name -> id so the existing name selects keep working. */
function useComplaintLookups() {
  const departmentsByName = useDepartmentLookup();
  const [equipmentByName, setEquipmentByName] = useState<Record<string, string>>({});
  const [engineersByName, setEngineersByName] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    equipmentApi
      .list({ limit: 200 })
      .then((page) => {
        if (cancelled) return;
        const byNameAndCode: Record<string, string> = {};
        for (const e of page.items) {
          byNameAndCode[e.name] = e._id;
          byNameAndCode[e.equipmentId] = e._id;
          byNameAndCode[`${e.equipmentId} — ${e.name}`] = e._id;
          byNameAndCode[`${e.equipmentId} · ${e.name}`] = e._id;
          byNameAndCode[e._id] = e._id;
        }
        setEquipmentByName(byNameAndCode);
      })
      .catch(() => undefined);
    usersApi
      .list({ role: "BIOMEDICAL_ENGINEER" })
      .then((page) => {
        if (cancelled) return;
        const list = Array.isArray(page) ? page : page.items;
        const byEngineer: Record<string, string> = {};
        for (const u of list) {
          byEngineer[u.name] = u._id;
          byEngineer[u.email] = u._id;
          byEngineer[u._id] = u._id;
        }
        setEngineersByName(byEngineer);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  return { departmentsByName, equipmentByName, engineersByName };
}

export function useComplaintMutations() {
  const lookups = useComplaintLookups();

  const create = useCallback(
    async (values: Record<string, string>) => {
      const { engineerId, equipmentId, ...rest } = toComplaintPayload(values, lookups);
      if (!equipmentId) throw new Error("Select an equipment record that exists in the register.");
      const complaint = await complaintsApi.create({ ...rest, equipmentId });
      if (engineerId)
        await complaintsApi.assign(complaint.complaintId || complaint._id, engineerId);
      return complaint;
    },
    [lookups],
  );

  const update = useCallback(
    async (id: string, values: Record<string, string>) => {
      const { engineerId, title, description, priority } = toComplaintPayload(values, lookups);
      const complaint = await complaintsApi.update(id, {
        title,
        description,
        priority: priority as ApiComplaint["priority"],
        ...(values["resolution"] ? { resolution: values["resolution"] } : {}),
      });
      if (engineerId) await complaintsApi.assign(id, engineerId);
      return complaint;
    },
    [lookups],
  );

  const remove = useCallback((id: string) => complaintsApi.remove(id), []);
  const assign = useCallback(
    (id: string, engineerId: string) => complaintsApi.assign(id, engineerId),
    [],
  );
  const setStatus = useCallback(
    (id: string, status: ApiComplaint["status"]) => complaintsApi.setStatus(id, status),
    [],
  );

  return { create, update, remove, assign, setStatus };
}
