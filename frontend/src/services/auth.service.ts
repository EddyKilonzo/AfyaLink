import { api, apiJson, setCsrfToken } from "@/lib/api";
import type { MfaSetup, User } from "@/types";

export interface LoginInput {
  email: string;
  password: string;
  /** TOTP code, only for accounts with two-factor sign-in enabled. */
  otp?: string;
}

/** Server messages that mean "ask for (or re-ask for) the one-time code". */
export const OTP_REQUIRED_MESSAGE = "One-time code required.";
export const OTP_INVALID_MESSAGE = "Invalid one-time code.";

const digitsOnly = (code: string) => code.replace(/\s+/g, "");

/**
 * Session endpoints. The session lives in an HTTP-only cookie the browser
 * manages; this module never sees or stores it. Responses that rotate the
 * CSRF token hand it to the API client straight away.
 */
export const authService = {
  me: () => api<{ user: User }>("/auth/me").then((r) => r.user),

  async login(input: LoginInput): Promise<User> {
    const res = await apiJson<{ user: User; csrfToken: string }>("/auth/login", "POST", {
      email: input.email.trim().toLowerCase(),
      password: input.password,
      ...(input.otp ? { otp: digitsOnly(input.otp) } : {}),
    });
    setCsrfToken(res.csrfToken);
    return res.user;
  },

  logout: () => apiJson<void>("/auth/logout", "POST"),

  /** Ends every session of this user on every device, including this one. */
  logoutAll: () => apiJson<void>("/auth/logout-all", "POST"),

  /** Ends all other sessions; this one gets a fresh cookie and CSRF token. */
  async changePassword(currentPassword: string, newPassword: string): Promise<User> {
    const res = await apiJson<{ user: User; csrfToken: string }>("/auth/change-password", "POST", {
      currentPassword,
      newPassword,
    });
    setCsrfToken(res.csrfToken);
    return res.user;
  },

  mfa: {
    /** Step 1: returns the secret and an otpauth:// URL to show as a QR code. */
    setup: (password: string) => apiJson<MfaSetup>("/auth/mfa/setup", "POST", { password }),
    /** Step 2: confirm with a code from the authenticator app. */
    enable: (code: string) => apiJson<void>("/auth/mfa/enable", "POST", { code: digitsOnly(code) }),
    disable: (password: string, code: string) =>
      apiJson<void>("/auth/mfa/disable", "POST", { password, code: digitsOnly(code) }),
  },
};
