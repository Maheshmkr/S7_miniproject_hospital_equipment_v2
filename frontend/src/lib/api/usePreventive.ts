import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import {
  preventiveApi,
  type PreventiveCompletion,
  type PreventiveQuery,
  type PreventiveStats,
} from "./preventiveApi";
import type { ApiAuditLog, ApiChecklistQuestion, ApiMaintenance, ApiPreventivePlan } from "./types";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

/** Preventive maintenance plans backed by MongoDB. Idle when VITE_API_URL is unset. */
export function usePreventiveList(query: PreventiveQuery = {}) {
  const [items, setItems] = useState<ApiPreventivePlan[] | null>(null);
  const [stats, setStats] = useState<PreventiveStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    const params = JSON.parse(key) as PreventiveQuery;
    setLoading(true);
    setError(null);
    Promise.all([preventiveApi.list(params), preventiveApi.stats(params).catch(() => null)])
      .then(([page, summary]) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setStats(summary);
      })
      .catch(
        (err) =>
          !cancelled && setError(message(err, "Unable to load preventive maintenance plans.")),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { enabled: apiEnabled, items, stats, total, loading, error, reload };
}

export function usePreventivePlan(id: string) {
  const [plan, setPlan] = useState<ApiPreventivePlan | null>(null);
  const [questions, setQuestions] = useState<ApiChecklistQuestion[]>([]);
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [visits, setVisits] = useState<ApiMaintenance[]>([]);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      preventiveApi.get(id),
      preventiveApi.history(id).catch(() => ({ logs: [], maintenance: [] })),
    ])
      .then(([detail, history]) => {
        if (cancelled) return;
        setPlan(detail.plan);
        setQuestions(detail.checklist?.questions ?? []);
        setLogs(history.logs);
        setVisits(history.maintenance);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load this preventive plan.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  return { enabled: apiEnabled, plan, questions, logs, visits, loading, error, reload };
}

export function usePreventiveMutations() {
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
    create: (payload: Parameters<typeof preventiveApi.create>[0]) =>
      run(() => preventiveApi.create(payload)),
    update: (id: string, payload: Partial<ApiPreventivePlan>) =>
      run(() => preventiveApi.update(id, payload)),
    setActive: (id: string, active: boolean) => run(() => preventiveApi.setActive(id, active)),
    assign: (id: string, engineerId: string) => run(() => preventiveApi.assign(id, engineerId)),
    complete: (id: string, payload?: PreventiveCompletion) =>
      run(() => preventiveApi.complete(id, payload)),
    remove: (id: string) => run(() => preventiveApi.remove(id)),
  };
}
