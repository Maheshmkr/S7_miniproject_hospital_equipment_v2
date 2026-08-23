import { del, get, post, put } from "./client";
import type { ApiComplaint, ApiDepartment, ApiEquipment, ApiWorkOrder } from "./types";

export const departmentsApi = {
  list: () => get<ApiDepartment[]>("/departments"),
  get: (id: string) => get<ApiDepartment>(`/departments/${id}`),
  create: (payload: Partial<ApiDepartment>) => post<ApiDepartment>("/departments", payload),
  update: (id: string, payload: Partial<ApiDepartment>) =>
    put<ApiDepartment>(`/departments/${id}`, payload),
  remove: (id: string) => del<null>(`/departments/${id}`),
  equipment: (id: string) => get<ApiEquipment[]>(`/departments/${id}/equipment`),
  complaints: (id: string) => get<ApiComplaint[]>(`/departments/${id}/complaints`),
  maintenance: (id: string) => get<ApiWorkOrder[]>(`/departments/${id}/maintenance`),
};
