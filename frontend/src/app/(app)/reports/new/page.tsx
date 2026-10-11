import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { ReportForm } from "@/features/reports/report-form";

export const metadata: Metadata = { title: "New health report" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return (
    <>
      <PageHeader
        title="New health report"
        description="Saved on this device first, then uploaded when a connection is available. Do not record names or ID numbers."
      />
      <ReportForm />
    </>
  );
}
