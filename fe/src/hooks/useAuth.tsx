import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getApiErrorMessage } from "../lib/api";
import { queryClient } from "../lib/queryClient";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "akuntansi.token";
const USER_KEY = "akuntansi.user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(false);

  const persist = useCallback((u: AuthUser | null, t: string | null) => {
    setUser(u);
    setToken(t);
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post("/auth/login", { email, password });
      // backend returns { success, data: { user, token } }
      const data = res.data?.data ?? res.data;
      const u: AuthUser = data.user;
      const t: string = data.token;
      persist(u, t);
      queryClient.clear();
    },
    [persist]
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const res = await api.post("/auth/register", { name, email, password });
      const data = res.data?.data ?? res.data;
      const u: AuthUser = data.user;
      const t: string = data.token;
      persist(u, t);
      queryClient.clear();
    },
    [persist]
  );

  const logout = useCallback(() => {
    persist(null, null);
    localStorage.removeItem("akuntansi.businessId");
    queryClient.clear();
  }, [persist]);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      const res = await api.get("/auth/me");
      const u = res.data?.data?.user ?? res.data?.data ?? null;
      if (u && u.email) {
        const mapped: AuthUser = { id: u.id ?? user?.id ?? 0, name: u.name ?? u.displayName ?? u.email, email: u.email };
        localStorage.setItem(USER_KEY, JSON.stringify(mapped));
        setUser(mapped);
      }
    } catch (e) {
      // token invalid -> logout
      const msg = getApiErrorMessage(e);
      if (String(msg).toLowerCase().includes("invalid") || String(msg).toLowerCase().includes("expired")) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, user, logout]);

  useEffect(() => {
    if (token && !user) {
      // try to fetch me if token exists but user missing
      refreshMe();
    }
  }, []); // once

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoading,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      refreshMe,
    }),
    [user, token, isLoading, login, register, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
