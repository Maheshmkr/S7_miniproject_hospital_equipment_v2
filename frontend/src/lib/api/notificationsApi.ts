import { get, patch, post } from "./client";
import type { ApiNotification } from "./types";

export type NotificationsResponse = {
  items: ApiNotification[];
  total: number;
  unreadCount: number;
};

export const notificationsApi = {
  list: (params?: { type?: string; severity?: string; isRead?: boolean }) =>
    get<NotificationsResponse>("/notifications", params),
  markRead: (id: string) => patch<ApiNotification>(`/notifications/${id}/read`, {}),
  markAllRead: () => patch<null>("/notifications/read-all", {}),
  create: (payload: {
    title: string;
    message: string;
    type?: string;
    severity?: string;
    link?: string;
  }) => post<ApiNotification>("/notifications", payload),
};
