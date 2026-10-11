import type { Metadata } from "next";
import { AuditScreen } from "@/features/admin/audit-screen";

export const metadata: Metadata = { title: "Audit log" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <AuditScreen />;
}
