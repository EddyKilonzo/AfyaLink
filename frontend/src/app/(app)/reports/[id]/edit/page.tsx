import type { Metadata } from "next";
import { ReportEditScreen } from "@/features/reports/report-edit-screen";

export const metadata: Metadata = { title: "Correct report" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <ReportEditScreen />;
}
