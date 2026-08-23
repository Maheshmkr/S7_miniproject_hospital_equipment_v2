import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { calibrationApi, type CalibrationQuery, type CalibrationStats } from "./calibrationApi";
import type {
  ApiAuditLog,
  ApiCalibration,
  ApiCalibrationCompletion,
  ApiChecklistQuestion,
} from "./types";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

/** Calibration records backed by MongoDB. Idle when VITE_API_URL is unset. */
export function useCalibrationList(query: CalibrationQuery = {}) {
  const [items, setItems] = useState<ApiCalibration[] | null>(null);
  const [stats, setStats] = useState<CalibrationStats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    const params = JSON.parse(key) as CalibrationQuery;
    setLoading(true);
    setError(null);
    Promise.all([calibrationApi.list(params), calibrationApi.stats(params).catch(() => null)])
      .then(([page, summary]) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
        setStats(summary);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load calibration records.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  return { enabled: apiEnabled, items, stats, total, loading, error, reload };
}

export function useCalibrationRecord(id: string) {
  const [calibration, setCalibration] = useState<ApiCalibration | null>(null);
  const [questions, setQuestions] = useState<ApiChecklistQuestion[]>([]);
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);
  const [previous, setPrevious] = useState<ApiCalibration[]>([]);
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
      calibrationApi.get(id),
      calibrationApi.history(id).catch(() => ({ logs: [], calibrations: [] })),
    ])
      .then(([detail, history]) => {
        if (cancelled) return;
        setCalibration(detail.calibration);
        setQuestions(detail.checklist?.questions ?? []);
        setLogs(history.logs);
        setPrevious(history.calibrations);
      })
      .catch(
        (err) => !cancelled && setError(message(err, "Unable to load this calibration record.")),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  return { enabled: apiEnabled, calibration, questions, logs, previous, loading, error, reload };
}

export function useCalibrationMutations() {
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
    create: (payload: Parameters<typeof calibrationApi.create>[0]) =>
      run(() => calibrationApi.create(payload)),
    update: (id: string, payload: Partial<ApiCalibration>) =>
      run(() => calibrationApi.update(id, payload)),
    setStatus: (id: string, status: string, notes?: string) =>
      run(() => calibrationApi.setStatus(id, status, notes)),
    assign: (id: string, engineerId: string) => run(() => calibrationApi.assign(id, engineerId)),
    complete: (id: string, payload: ApiCalibrationCompletion) =>
      run(() => calibrationApi.complete(id, payload)),
    remove: (id: string) => run(() => calibrationApi.remove(id)),
  };
}
