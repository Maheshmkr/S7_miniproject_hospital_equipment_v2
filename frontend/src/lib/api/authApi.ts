import { get, post, setToken } from "./client";
import type { ApiUser } from "./types";

export type LoginResult = { user: ApiUser; token: string };

export const authApi = {
  async login(email: string, password: string) {
    const result = await post<LoginResult>("/auth/login", { email, password });
    setToken(result.token);
    return result;
  },
  async register(payload: {
    name: string;
    email: string;
    password: string;
    role: ApiUser["role"];
    departmentId?: string;
    employeeId?: string;
    phone?: string;
    title?: string;
  }) {
    const result = await post<LoginResult>("/auth/register", payload);
    setToken(result.token);
    return result;
  },
  me: () => get<{ user: ApiUser }>("/auth/me"),
  async logout() {
    try {
      await post("/auth/logout");
    } finally {
      setToken(null);
    }
  },
};
