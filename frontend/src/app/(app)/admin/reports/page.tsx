import type { Metadata } from "next";
import { AdminReportsScreen } from "@/features/admin/admin-reports-screen";

export const metadata: Metadata = { title: "Report review" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <AdminReportsScreen />;
}
