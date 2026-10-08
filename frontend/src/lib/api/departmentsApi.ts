import { del, get, post, put } from "./client";
import type { ApiComplaint, ApiDepartment, ApiEquipment, ApiUser, ApiWorkOrder } from "./types";

export const departmentsApi = {
  list: () => get<ApiDepartment[]>("/departments"),
  get: (id: string) => get<ApiDepartment>(`/departments/${id}`),
  create: (payload: Partial<ApiDepartment>) => post<ApiDepartment>("/departments", payload),
  update: (id: string, payload: Partial<ApiDepartment>) =>
    put<ApiDepartment>(`/departments/${id}`, payload),
  remove: (id: string) => del<null>(`/departments/${id}`),
  staff: (id: string) => get<ApiUser[]>(`/departments/${id}/staff`),
  mapStaff: (id: string, userIds: string[], role?: string) =>
    post<ApiUser[]>(`/departments/${id}/staff/map`, { userIds, role }),
  unmapStaff: (id: string, userIds: string[]) =>
    post<ApiUser[]>(`/departments/${id}/staff/unmap`, { userIds }),
  equipment: (id: string) => get<ApiEquipment[]>(`/departments/${id}/equipment`),
  mapEquipment: (id: string, equipmentIds: string[]) =>
    post<ApiEquipment[]>(`/departments/${id}/equipment/map`, { equipmentIds }),
  unmapEquipment: (id: string, equipmentIds: string[]) =>
    post<ApiEquipment[]>(`/departments/${id}/equipment/unmap`, { equipmentIds }),
  complaints: (id: string) => get<ApiComplaint[]>(`/departments/${id}/complaints`),
  maintenance: (id: string) => get<ApiWorkOrder[]>(`/departments/${id}/maintenance`),
};

