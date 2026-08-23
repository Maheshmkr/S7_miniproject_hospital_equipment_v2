import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import {
  purchaseOrdersApi,
  type PurchaseOrderQuery,
  type PurchaseOrderStats,
} from "./purchaseOrdersApi";
import { toPurchaseOrderRecord } from "./purchaseOrderRecords";
import type { ApiPurchaseOrder, ApiPurchaseOrderInput } from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

/** Purchase orders backed by MongoDB. Idle when VITE_API_URL is unset. */
export function usePurchaseOrderList(query: PurchaseOrderQuery = {}) {
  const [items, setItems] = useState<ApiPurchaseOrder[] | null>(null);
  const [stats, setStats] = useState<PurchaseOrderStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    const params = JSON.parse(key) as PurchaseOrderQuery;
    setLoading(true);
    setError(null);
    Promise.all([purchaseOrdersApi.list(params), purchaseOrdersApi.stats().catch(() => null)])
      .then(([page, summary]) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setStats(summary);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load purchase orders.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: ModuleRecord[] | null = items ? items.map(toPurchaseOrderRecord) : null;
  return { enabled: apiEnabled, items, records, stats, total, loading, error, reload };
}

export function usePurchaseOrderRecord(id: string) {
  const [purchaseOrder, setPurchaseOrder] = useState<ApiPurchaseOrder | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    purchaseOrdersApi
      .get(id)
      .then((po) => !cancelled && setPurchaseOrder(po))
      .catch((err) => !cancelled && setError(message(err, "Unable to load this purchase order.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record: ModuleRecord | null = purchaseOrder ? toPurchaseOrderRecord(purchaseOrder) : null;
  return { enabled: apiEnabled, purchaseOrder, record, loading, error, reload };
}

export function usePurchaseOrderMutations() {
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
    create: (payload: ApiPurchaseOrderInput) => run(() => purchaseOrdersApi.create(payload)),
    update: (id: string, payload: Partial<ApiPurchaseOrderInput>) =>
      run(() => purchaseOrdersApi.update(id, payload)),
    setStatus: (id: string, status: string, reason?: string) =>
      run(() => purchaseOrdersApi.setStatus(id, status, reason)),
    approve: (id: string, reason?: string) => run(() => purchaseOrdersApi.approve(id, reason)),
    reject: (id: string, reason?: string) => run(() => purchaseOrdersApi.reject(id, reason)),
    remove: (id: string) => run(() => purchaseOrdersApi.remove(id)),
  };
}
