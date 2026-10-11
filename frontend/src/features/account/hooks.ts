"use client";

import { useAuth } from "@/features/auth/auth-context";
import { useMutation } from "@/hooks/use-mutation";
import { authService } from "@/services/auth.service";

export function useChangePassword() {
  const { changePassword } = useAuth();
  return useMutation((currentPassword: string, newPassword: string) => changePassword(currentPassword, newPassword));
}

export function useLogoutEverywhere() {
  const { logoutEverywhere } = useAuth();
  return useMutation(async () => {
    await logoutEverywhere();
    return true;
  });
}

/**
 * Two-factor enrolment: `setup` (password) → show QR/secret → `enable` (code).
 * `refresh()` afterwards so `user.mfaEnabled` updates.
 */
export function useMfa() {
  const { refresh } = useAuth();
  const setup = useMutation((password: string) => authService.mfa.setup(password));
  const enable = useMutation(async (code: string) => {
    await authService.mfa.enable(code);
    await refresh();
    return true;
  });
  const disable = useMutation(async (password: string, code: string) => {
    await authService.mfa.disable(password, code);
    await refresh();
    return true;
  });
  return { setup, enable, disable };
}
