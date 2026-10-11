import type { ReactNode } from "react";
import { RequireAuth } from "@/components/require-auth";

/** UX gate only: every /users, /audit-logs, export and review call is ADMIN-checked by the API. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RequireAuth roles={["ADMIN"]}>{children}</RequireAuth>;
}
