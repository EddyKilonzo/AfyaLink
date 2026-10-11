import type { Metadata } from "next";
import { AdminOverviewScreen } from "@/features/admin/admin-overview-screen";

export const metadata: Metadata = { title: "Administrator overview" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <AdminOverviewScreen />;
}
