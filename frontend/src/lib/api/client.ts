import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * Centralised Axios client.
 *
 * The backend base URL comes from VITE_API_URL. When it is not configured the
 * app keeps running on its existing in-app demo data — `apiEnabled` is the single
 * switch every feature module checks before it calls the API.
 */
export const API_BASE_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

export const apiEnabled = Boolean(API_BASE_URL);

export const TOKEN_STORAGE_KEY = "medixa.token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  else window.localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export const client: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || "/api",
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});

export type ApiEnvelope<T> = { success: boolean; data: T; message?: string };

export class ApiRequestError extends Error {
  status: number;
  details: string[];
  constructor(message: string, status: number, details: string[] = []) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

client.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<{ message?: string; details?: string[] }>) => {
    if (error.code === "ECONNABORTED") {
      return Promise.reject(new ApiRequestError("The request timed out. Please try again.", 408));
    }
    const status = error.response?.status ?? 0;
    if (status === 401) setToken(null);
    const message =
      error.response?.data?.message ||
      (status === 0
        ? "Unable to reach the server. Check that the API is running."
        : "Something went wrong");
    return Promise.reject(
      new ApiRequestError(message, status, error.response?.data?.details ?? []),
    );
  },
);

/** Unwraps the { success, data } envelope so callers work with plain data. */
export async function request<T>(fn: () => Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  const response = await fn();
  return response.data.data;
}

export const get = <T>(url: string, params?: Record<string, unknown>) =>
  request<T>(() => client.get(url, { params }));
export const post = <T>(url: string, body?: unknown) => request<T>(() => client.post(url, body));
export const put = <T>(url: string, body?: unknown) => request<T>(() => client.put(url, body));
export const patch = <T>(url: string, body?: unknown) => request<T>(() => client.patch(url, body));
export const del = <T>(url: string) => request<T>(() => client.delete(url));
