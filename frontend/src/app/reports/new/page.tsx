import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = { title: "New health report" };

export default function Page() {
  return <RoutePlaceholder title="New health report" purpose="Report form (features/reports/report-form.tsx) that saves to IndexedDB first, then syncs." />;
}
