import type { Metadata } from "next";
import { ReportsScreen } from "@/features/reports/reports-screen";

export const metadata: Metadata = { title: "My reports" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <ReportsScreen />;
}
