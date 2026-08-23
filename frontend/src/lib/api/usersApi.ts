import { del, get, patch, post, put } from "./client";
import type { ApiUser, Paged } from "./types";

export const usersApi = {
  list: (params?: {
    search?: string;
    role?: string;
    status?: string;
    departmentId?: string;
    page?: number;
  }) => get<Paged<ApiUser>>("/users", params),
  get: (id: string) => get<ApiUser>(`/users/${id}`),
  create: (payload: Partial<ApiUser> & { password: string }) => post<ApiUser>("/users", payload),
  update: (id: string, payload: Partial<ApiUser>) => put<ApiUser>(`/users/${id}`, payload),
  setStatus: (id: string, status: ApiUser["status"]) =>
    patch<ApiUser>(`/users/${id}/status`, { status }),
  remove: (id: string) => del<null>(`/users/${id}`),
};
