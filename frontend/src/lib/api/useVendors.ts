import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { vendorsApi, type VendorDetail, type VendorQuery, type VendorStats } from "./vendorsApi";
import { toVendorRecord } from "./vendorRecords";
import type { ApiVendor } from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

/** Vendor register backed by MongoDB. Idle when VITE_API_URL is unset. */
export function useVendorList(query: VendorQuery = {}) {
  const [items, setItems] = useState<ApiVendor[] | null>(null);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    const params = JSON.parse(key) as VendorQuery;
    setLoading(true);
    setError(null);
    Promise.all([vendorsApi.list(params), vendorsApi.stats().catch(() => null)])
      .then(([page, summary]) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setStats(summary);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load the vendor register.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: ModuleRecord[] | null = items ? items.map((v) => toVendorRecord(v)) : null;
  return { enabled: apiEnabled, items, records, stats, total, loading, error, reload };
}

export function useVendorRecord(id: string) {
  const [detail, setDetail] = useState<VendorDetail | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    vendorsApi
      .get(id)
      .then((d) => !cancelled && setDetail(d))
      .catch((err) => !cancelled && setError(message(err, "Unable to load this vendor.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record: ModuleRecord | null = detail
    ? toVendorRecord(detail.vendor, detail.warranties.length, detail.equipment.length)
    : null;
  return {
    enabled: apiEnabled,
    detail,
    vendor: detail?.vendor ?? null,
    record,
    loading,
    error,
    reload,
  };
}

export function useVendorMutations() {
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
    create: (payload: Parameters<typeof vendorsApi.create>[0]) =>
      run(() => vendorsApi.create(payload)),
    update: (id: string, payload: Partial<ApiVendor>) => run(() => vendorsApi.update(id, payload)),
    setStatus: (id: string, status: ApiVendor["status"]) =>
      run(() => vendorsApi.setStatus(id, status)),
    remove: (id: string) => run(() => vendorsApi.remove(id)),
  };
}
