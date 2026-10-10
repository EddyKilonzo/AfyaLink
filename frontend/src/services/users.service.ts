import { api } from "@/lib/api";
import type { Paginated, User } from "@/types";

export const usersService = {
  list: (page = 1, limit = 20) => api<Paginated<User>>(`/users?page=${page}&limit=${limit}`),
};
