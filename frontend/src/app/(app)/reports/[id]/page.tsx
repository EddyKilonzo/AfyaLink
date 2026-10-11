import type { Metadata } from "next";
import { ReportDetailScreen } from "@/features/reports/report-detail-screen";

export const metadata: Metadata = { title: "Report details" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <ReportDetailScreen />;
}
