import { useCallback, useEffect, useState } from "react";
import { apiEnabled } from "./client";
import { notificationsApi, type NotificationsResponse } from "./notificationsApi";
import type { ApiNotification } from "./types";

export function useNotifications() {
  const [data, setData] = useState<NotificationsResponse>({ items: [], total: 0, unreadCount: 0 });
  const [loading, setLoading] = useState(apiEnabled);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!apiEnabled) return;
    let cancelled = false;
    notificationsApi
      .list()
      .then((res) => !cancelled && setData(res))
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setData((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
        items: prev.items.map((n) => (n._id === id || n.id === id ? { ...n, isRead: true } : n)),
      }));
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      setData((prev) => ({
        ...prev,
        unreadCount: 0,
        items: prev.items.map((n) => ({ ...n, isRead: true })),
      }));
    } catch (err) {
      console.warn("Failed to mark all notifications as read:", err);
    }
  }, []);

  return {
    enabled: apiEnabled,
    notifications: data.items,
    total: data.total,
    unreadCount: data.unreadCount,
    loading,
    reload,
    markRead,
    markAllRead,
  };
}
