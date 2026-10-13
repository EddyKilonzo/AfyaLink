"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, clearCsrfToken, onUnauthorized } from "@/lib/api";
import { cachedProfile } from "@/lib/db";
import { purgeSyncedReports } from "@/features/sync/sync-engine";
import { authService, OTP_INVALID_MESSAGE, OTP_REQUIRED_MESSAGE, type LoginInput } from "@/services/auth.service";
import type { User, UserRole } from "@/types";

type AuthStatus = "loading" | "authenticated" | "anonymous";

/**
 * Result of a sign-in attempt. `otp-required` means the password was right
 * and the account needs a one-time code: call `login` again with `otp`.
 */
export type LoginResult =
  | { status: "ok"; user: User }
  | { status: "otp-required" }
  | { status: "otp-invalid" };

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** True when the user comes from the local cache because the server was unreachable. */
  offlineSession: boolean;
  /** Set when the server ended the session (expiry, revocation, deactivation). Cleared on sign-in. */
  sessionExpired: boolean;
  login: (input: LoginInput) => Promise<LoginResult>;
  logout: () => Promise<void>;
  /** Ends every session on every device, then signs out here. */
  logoutEverywhere: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<User>;
  updateProfile: (input: { fullName: string; phone?: string | null }) => Promise<User>;
  /** Uploads a new profile picture. */
  updateProfilePicture: (file: File) => Promise<User>;
  refresh: () => Promise<void>;
  hasRole: (...roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [offlineSession, setOfflineSession] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  const signedIn = useCallback(async (next: User) => {
    setUser(next);
    setOfflineSession(false);
    setSessionExpired(false);
    setStatus("authenticated");
    await cachedProfile.set(next);
  }, []);

  const signedOut = useCallback(async (expired: boolean) => {
    clearCsrfToken();
    await cachedProfile.clear();
    setUser(null);
    setOfflineSession(false);
    setSessionExpired(expired);
    setStatus("anonymous");
  }, []);

  const refresh = useCallback(async () => {
    try {
      await signedIn(await authService.me());
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
      await signedOut(false);
    }
  }, [signedIn, signedOut]);

  useEffect(() => {
    // Initial session check against the API; state updates happen after the await.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  // Any 401 from the API while signed in means the server ended the session.
  useEffect(
    () =>
      onUnauthorized(() => {
        if (statusRef.current === "authenticated") void signedOut(true);
      }),
    [signedOut],
  );

  const login = useCallback(
    async (input: LoginInput): Promise<LoginResult> => {
      try {
        const next = await authService.login(input);
        await signedIn(next);
        return { status: "ok", user: next };
      } catch (error) {
        if (error instanceof ApiError && error.isUnauthorized) {
          if (error.message === OTP_REQUIRED_MESSAGE) return { status: "otp-required" };
          if (error.message === OTP_INVALID_MESSAGE) return { status: "otp-invalid" };
        }
        throw error;
      }
    },
    [signedIn],
  );

  const logout = useCallback(async () => {
    const ownerId = user?.id;
    try {
      await authService.logout();
    } catch (error) {
      // Still sign out locally; the cookie expires on its own if the request failed.
      console.warn("[AfyaLink] Logout request failed; signing out locally.", error);
    } finally {
      // Confirmed reports are on the server; do not leave health data on a shared device.
      if (ownerId) await purgeSyncedReports(ownerId);
      await signedOut(false);
    }
  }, [user, signedOut]);

  const logoutEverywhere = useCallback(async () => {
    const ownerId = user?.id;
    await authService.logoutAll();
    if (ownerId) await purgeSyncedReports(ownerId);
    await signedOut(false);
  }, [user, signedOut]);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const next = await authService.changePassword(currentPassword, newPassword);
      await signedIn(next);
      return next;
    },
    [signedIn],
  );

  const updateProfile = useCallback(
    async (input: { fullName: string; phone?: string | null }) => {
      const next = await authService.updateProfile(input);
      await signedIn(next);
      return next;
    },
    [signedIn],
  );

  const updateProfilePicture = useCallback(
    async (file: File) => {
      const next = await authService.uploadProfilePicture(file);
      await signedIn(next);
      return next;
    },
    [signedIn],
  );

  const hasRole = useCallback((...roles: UserRole[]) => Boolean(user && roles.includes(user.role)), [user]);

  const value = useMemo(
    () => ({ status, user, offlineSession, sessionExpired, login, logout, logoutEverywhere, changePassword, updateProfile, updateProfilePicture, refresh, hasRole }),
    [status, user, offlineSession, sessionExpired, login, logout, logoutEverywhere, changePassword, updateProfile, updateProfilePicture, refresh, hasRole],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}
