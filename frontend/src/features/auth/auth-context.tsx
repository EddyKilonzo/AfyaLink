"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiError, clearCsrfToken } from "@/lib/api";
import { cachedProfile } from "@/lib/db";
import type { User } from "@/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** True when the user comes from the local cache because the server was unreachable. */
  offlineSession: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [offlineSession, setOfflineSession] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await api<{ user: User }>("/auth/me");
      setUser(res.user);
      setOfflineSession(false);
      setStatus("authenticated");
      await cachedProfile.set(res.user);
    } catch (error) {
      if (error instanceof ApiError && error.isRetryable) {
        // Server unreachable: let a previously signed-in CHV keep recording offline.
        // The server still authenticates every sync request.
        const cached = await cachedProfile.get();
        setUser(cached ?? null);
        setOfflineSession(Boolean(cached));
        setStatus(cached ? "authenticated" : "anonymous");
        return;
      }
      if (error instanceof ApiError && error.isUnauthorized) await cachedProfile.clear();
      setUser(null);
      setOfflineSession(false);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    // Initial session check against the API; state updates happen after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ user: User }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setUser(res.user);
    setOfflineSession(false);
    setStatus("authenticated");
    await cachedProfile.set(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<void>("/auth/logout", { method: "POST" });
    } catch (error) {
      // Still sign out locally; the cookie expires on its own if the request failed.
      console.warn("[AfyaLink] Logout request failed; signing out locally.", error);
    } finally {
      clearCsrfToken();
      await cachedProfile.clear();
      setUser(null);
      setOfflineSession(false);
      setStatus("anonymous");
    }
  }, []);

  const value = useMemo(
    () => ({ status, user, offlineSession, login, logout, refresh }),
    [status, user, offlineSession, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
