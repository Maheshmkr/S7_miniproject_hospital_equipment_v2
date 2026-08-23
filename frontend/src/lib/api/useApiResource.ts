import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";

export type ApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** true when the request succeeded but returned nothing to show */
  empty: boolean;
  reload: () => void;
};

const isEmpty = (value: unknown) =>
  value == null ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" &&
    "items" in (value as Record<string, unknown>) &&
    Array.isArray((value as { items: unknown[] }).items) &&
    (value as { items: unknown[] }).items.length === 0);

/**
 * Loading / empty / error / success wrapper for API-backed pages.
 * When VITE_API_URL is not configured the hook stays idle so existing screens
 * keep rendering their in-app demo data unchanged.
 */
export function useApiResource<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof ApiRequestError ? err.message : "Unable to load data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return { data, loading, error, empty: !loading && !error && isEmpty(data), reload };
}
