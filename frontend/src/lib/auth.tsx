import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiEnabled, getToken, setToken } from "@/lib/api/client";
import { authApi } from "@/lib/api/authApi";
import type { ApiRole, ApiUser } from "@/lib/api/types";

export type Role = "admin" | "engineer" | "staff" | "technician";

export type SessionUser = {
  email: string;
  password: string;
  name: string;
  initials: string;
  role: Role;
  title: string;
  home: string;
};

export const demoUsers: SessionUser[] = [
  {
    email: "emilia.greene@medixa.health",
    password: "Medixa#2026",
    name: "Emilia Greene",
    initials: "EG",
    role: "admin",
    title: "Administrator",
    home: "/",
  },
  {
    email: "daniel.okafor@medixa.health",
    password: "Medixa#2026",
    name: "Daniel Okafor",
    initials: "DO",
    role: "engineer",
    title: "Senior Biomedical Engineer",
    home: "/engineer",
  },
  {
    email: "clara.whitfield@medixa.health",
    password: "Medixa#2026",
    name: "Clara Whitfield",
    initials: "CW",
    role: "staff",
    title: "Radiology Department Coordinator",
    home: "/staff",
  },
];

const STORAGE_KEY = "medixa.session";

/** Backend role names ↔ the role names the frontend workspaces already use. */
const roleFromApi: Record<ApiRole, Role> = {
  ADMINISTRATOR: "admin",
  BIOMEDICAL_ENGINEER: "engineer",
  DEPARTMENT_STAFF: "staff",
  TECHNICIAN: "technician",
};

const homeForRole: Record<Role, string> = {
  admin: "/",
  engineer: "/engineer",
  staff: "/staff",
  technician: "/inventory",
};

function toSessionUser(apiUser: ApiUser): SessionUser {
  const role = roleFromApi[apiUser.role] ?? "staff";
  return {
    email: apiUser.email,
    password: "",
    name: apiUser.name,
    initials:
      apiUser.initials ||
      apiUser.name
        .split(/\s+/)
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    role,
    title: apiUser.title ?? "",
    home: homeForRole[role],
  };
}

type AuthValue = {
  user: SessionUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signOut: () => void;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      // Backend session takes priority when the API is configured.
      if (apiEnabled && getToken()) {
        try {
          const { user: apiUser } = await authApi.me();
          if (!cancelled) setUser(toSessionUser(apiUser));
          if (!cancelled) setReady(true);
          return;
        } catch {
          setToken(null);
        }
      }
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { email?: string };
          const match = demoUsers.find((u) => u.email === parsed.email);
          if (match && !cancelled) setUser(match);
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setReady(true);
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (apiEnabled) {
      const { user: apiUser } = await authApi.login(email.trim(), password);
      const session = toSessionUser(apiUser);
      setUser(session);
      return session;
    }
    const match = demoUsers.find(
      (u) => u.email.toLowerCase() === email.trim().toLowerCase() && u.password === password,
    );
    if (!match) throw new Error("Invalid email or password.");
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ email: match.email }));
    setUser(match);
    return match;
  }, []);

  const signOut = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    if (apiEnabled) void authApi.logout().catch(() => setToken(null));
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
