import { api, apiJson, seg, toQuery } from "@/lib/api";
import type { Paginated, User, UserRole } from "@/types";

export interface UserFilters {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
  /** Case-insensitive match on name or email. */
  q?: string;
}

export interface CreateUserInput {
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  locationId?: number;
  password: string;
}

/** `null` clears `phone` or `locationId`. Email and password change elsewhere. */
export interface UpdateUserInput {
  fullName?: string;
  phone?: string | null;
  role?: UserRole;
  locationId?: number | null;
  isActive?: boolean;
}

/** ADMIN only; the API enforces the role on every call. */
export const usersService = {
  list: (filters: UserFilters = {}) => api<Paginated<User>>(`/users${toQuery(filters)}`),
  get: (id: string) => api<{ user: User }>(`/users/${seg(id)}`).then((r) => r.user),
  create: (input: CreateUserInput) => apiJson<{ user: User }>("/users", "POST", input).then((r) => r.user),
  update: (id: string, input: UpdateUserInput) =>
    apiJson<{ user: User }>(`/users/${seg(id)}`, "PATCH", input).then((r) => r.user),
  /** Ends the user's sessions. The API refuses self-deactivation. */
  deactivate: (id: string) => usersService.update(id, { isActive: false }),
  reactivate: (id: string) => usersService.update(id, { isActive: true }),
  /** Sets a new password and ends all of that user's sessions. */
  resetPassword: (id: string, password: string) =>
    apiJson<void>(`/users/${seg(id)}/reset-password`, "POST", { password }),
  /** Lost authenticator: turns two-factor off and ends that user's sessions. */
  resetMfa: (id: string) => apiJson<void>(`/users/${seg(id)}/reset-mfa`, "POST"),
};
