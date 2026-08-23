import { del, get, post, put } from "./client";
import type {
  ApiInventoryAlerts,
  ApiInventoryInput,
  ApiInventoryItem,
  ApiInventoryStats,
  ApiStockMovement,
  Paged,
} from "./types";

export type InventoryQuery = {
  category?: string;
  status?: string;
  departmentId?: string;
  vendorId?: string;
  expiry?: string;
  search?: string;
  page?: number;
  limit?: number;
};

export type ReceiveStockInput = {
  quantity: number;
  unitCost?: number;
  batchNumber?: string;
  expiryDate?: string;
  purchaseOrderId?: string;
  poItemId?: string;
  reference?: string;
  reason?: string;
  notes?: string;
  storageLocation?: string;
};

export type IssueStockInput = {
  quantity: number;
  departmentId?: string;
  equipmentId?: string;
  workOrderId?: string;
  reference?: string;
  reason?: string;
  notes?: string;
};

export type ReturnStockInput = {
  quantity: number;
  reference?: string;
  reason?: string;
  notes?: string;
  departmentId?: string;
};

export type AdjustStockInput = {
  newQuantity: number;
  reason: string;
  notes?: string;
  unitCost?: number;
};

export type TransferStockInput = {
  quantity: number;
  targetDepartmentId: string;
  targetStorageLocation?: string;
  reason?: string;
  notes?: string;
};

/** Inventory API client — mirrors /api/inventory. */
export const inventoryApi = {
  list: (params?: InventoryQuery) => get<Paged<ApiInventoryItem>>("/inventory", params),
  stats: () => get<ApiInventoryStats>("/inventory/stats"),
  alerts: () => get<ApiInventoryAlerts>("/inventory/alerts"),
  get: (id: string) =>
    get<{ item: ApiInventoryItem; movements: ApiStockMovement[]; relatedPOs: unknown[] }>(
      `/inventory/${id}`,
    ),
  movements: (id: string, params?: { page?: number; limit?: number }) =>
    get<Paged<ApiStockMovement>>(`/inventory/${id}/movements`, params),
  allMovements: (params?: {
    type?: string;
    itemId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }) => get<Paged<ApiStockMovement>>("/inventory/movements", params),
  create: (payload: ApiInventoryInput) => post<ApiInventoryItem>("/inventory", payload),
  update: (id: string, payload: Partial<ApiInventoryInput>) =>
    put<ApiInventoryItem>(`/inventory/${id}`, payload),
  remove: (id: string) => del<{ deleted: string }>(`/inventory/${id}`),
  receive: (id: string, payload: ReceiveStockInput) =>
    post<{ item: ApiInventoryItem; movement: ApiStockMovement }>(
      `/inventory/${id}/receive`,
      payload,
    ),
  issue: (id: string, payload: IssueStockInput) =>
    post<{ item: ApiInventoryItem; movement: ApiStockMovement }>(`/inventory/${id}/issue`, payload),
  returnStock: (id: string, payload: ReturnStockInput) =>
    post<{ item: ApiInventoryItem; movement: ApiStockMovement }>(
      `/inventory/${id}/return`,
      payload,
    ),
  adjust: (id: string, payload: AdjustStockInput) =>
    post<{ item: ApiInventoryItem; movement: ApiStockMovement }>(
      `/inventory/${id}/adjust`,
      payload,
    ),
  transfer: (id: string, payload: TransferStockInput) =>
    post<{ item: ApiInventoryItem; movement: ApiStockMovement }>(
      `/inventory/${id}/transfer`,
      payload,
    ),
};
