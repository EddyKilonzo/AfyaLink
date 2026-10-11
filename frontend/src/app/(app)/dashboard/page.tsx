import type { Metadata } from "next";
import { DashboardScreen } from "@/features/dashboard/dashboard-screen";

export const metadata: Metadata = { title: "Dashboard" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <DashboardScreen />;
}
