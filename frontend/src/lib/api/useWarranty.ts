import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { warrantyApi, type WarrantyQuery, type WarrantyStats } from "./warrantyApi";
import { toWarrantyRecord } from "./warrantyRecords";
import type { ApiWarranty } from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

/** Warranty & AMC contracts backed by MongoDB. Idle when VITE_API_URL is unset. */
export function useWarrantyList(query: WarrantyQuery = {}) {
  const [items, setItems] = useState<ApiWarranty[] | null>(null);
  const [stats, setStats] = useState<WarrantyStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    const params = JSON.parse(key) as WarrantyQuery;
    setLoading(true);
    setError(null);
    Promise.all([warrantyApi.list(params), warrantyApi.stats(params).catch(() => null)])
      .then(([page, summary]) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setStats(summary);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load contract records.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: ModuleRecord[] | null = items ? items.map(toWarrantyRecord) : null;
  return { enabled: apiEnabled, items, records, stats, total, loading, error, reload };
}

export function useWarrantyRecord(id: string) {
  const [warranty, setWarranty] = useState<ApiWarranty | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    warrantyApi
      .get(id)
      .then((w) => !cancelled && setWarranty(w))
      .catch((err) => !cancelled && setError(message(err, "Unable to load this contract.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record: ModuleRecord | null = warranty ? toWarrantyRecord(warranty) : null;
  return { enabled: apiEnabled, warranty, record, loading, error, reload };
}

export function useWarrantyMutations() {
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
    create: (payload: Parameters<typeof warrantyApi.create>[0]) =>
      run(() => warrantyApi.create(payload)),
    update: (id: string, payload: Partial<ApiWarranty>) =>
      run(() => warrantyApi.update(id, payload)),
    remove: (id: string) => run(() => warrantyApi.remove(id)),
  };
}
