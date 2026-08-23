import { useCallback, useEffect, useState } from "react";
import { ApiRequestError, apiEnabled } from "./client";
import { usersApi } from "./usersApi";
import { toUserRecord } from "./userRecords";
import type { ApiUser } from "./types";
import type { ModuleRecord } from "@/lib/modules";

const message = (err: unknown, fallback: string) =>
  err instanceof ApiRequestError ? err.message : fallback;

export type UserQuery = {
  search?: string;
  role?: string;
  status?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
};

/** User register backed by MongoDB. Idle when VITE_API_URL is unset. */
export function useUserList(query: UserQuery = {}) {
  const [items, setItems] = useState<ApiUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const key = JSON.stringify(query);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    const params = JSON.parse(key) as UserQuery;
    setLoading(true);
    setError(null);
    usersApi
      .list(params)
      .then((page) => {
        if (cancelled) return;
        setItems(page.items);
        setTotal(page.total);
      })
      .catch((err) => !cancelled && setError(message(err, "Unable to load the users register.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, nonce]);

  const records: ModuleRecord[] | null = items ? items.map((u) => toUserRecord(u)) : null;
  return { enabled: apiEnabled, items, records, total, loading, error, reload };
}

export function useUserRecord(id: string) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(apiEnabled);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled || !id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    usersApi
      .get(id)
      .then((u) => !cancelled && setUser(u))
      .catch((err) => !cancelled && setError(message(err, "Unable to load this user record.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const record: ModuleRecord | null = user ? toUserRecord(user) : null;
  return {
    enabled: apiEnabled,
    user,
    record,
    loading,
    error,
    reload,
  };
}

export function useUserMutations() {
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
    create: (payload: Partial<ApiUser> & { password: string }) =>
      run(() => usersApi.create(payload)),
    update: (id: string, payload: Partial<ApiUser> & { password?: string }) =>
      run(() => usersApi.update(id, payload)),
    setStatus: (id: string, status: ApiUser["status"]) => run(() => usersApi.setStatus(id, status)),
    remove: (id: string) => run(() => usersApi.remove(id)),
  };
}
