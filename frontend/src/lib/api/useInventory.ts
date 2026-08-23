import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import {
  inventoryApi,
  type AdjustStockInput,
  type InventoryQuery,
  type IssueStockInput,
  type ReceiveStockInput,
  type ReturnStockInput,
  type TransferStockInput,
} from "./inventoryApi";
import { toInventoryRecord } from "./inventoryRecords";
import type {
  ApiInventoryAlerts,
  ApiInventoryInput,
  ApiInventoryItem,
  ApiInventoryStats,
  ApiStockMovement,
} from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

export function useInventoryList(query: InventoryQuery = {}) {
  const [items, setItems] = useState<ApiInventoryItem[] | null>(null);
  const [stats, setStats] = useState<ApiInventoryStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    const params = JSON.parse(key) as InventoryQuery;
    setLoading(true);
    setError(null);
    Promise.all([inventoryApi.list(params), inventoryApi.stats().catch(() => null)])
      .then(([page, summary]) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setStats(summary);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load inventory items.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: ModuleRecord[] | null = items ? items.map((i) => toInventoryRecord(i)) : null;
  return { enabled: apiEnabled, items, records, stats, total, loading, error, reload };
}

export function useInventoryRecord(id: string) {
  const [item, setItem] = useState<ApiInventoryItem | null>(null);
  const [movements, setMovements] = useState<ApiStockMovement[]>([]);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    inventoryApi
      .get(id)
      .then((res) => {
        if (cancelled) return;
        setItem(res.item);
        setMovements(res.movements || []);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load this inventory item.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record: ModuleRecord | null = item ? toInventoryRecord(item, movements) : null;
  return { enabled: apiEnabled, item, movements, record, loading, error, reload };
}

export function useInventoryAlerts() {
  const [alerts, setAlerts] = useState<ApiInventoryAlerts | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiEnabled) return;
    inventoryApi
      .alerts()
      .then(setAlerts)
      .catch((err) => setError(message(err, "Failed to load inventory alerts.")))
      .finally(() => setLoading(false));
  }, []);

  return { enabled: apiEnabled, alerts, loading, error };
}

export function useInventoryMutations() {
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
    create: (payload: ApiInventoryInput) => run(() => inventoryApi.create(payload)),
    update: (id: string, payload: Partial<ApiInventoryInput>) =>
      run(() => inventoryApi.update(id, payload)),
    remove: (id: string) => run(() => inventoryApi.remove(id)),
    receive: (id: string, payload: ReceiveStockInput) =>
      run(() => inventoryApi.receive(id, payload)),
    issue: (id: string, payload: IssueStockInput) => run(() => inventoryApi.issue(id, payload)),
    returnStock: (id: string, payload: ReturnStockInput) =>
      run(() => inventoryApi.returnStock(id, payload)),
    adjust: (id: string, payload: AdjustStockInput) => run(() => inventoryApi.adjust(id, payload)),
    transfer: (id: string, payload: TransferStockInput) =>
      run(() => inventoryApi.transfer(id, payload)),
  };
}
