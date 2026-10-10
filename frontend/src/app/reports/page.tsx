import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = { title: "Health reports" };

export default function Page() {
  return <RoutePlaceholder title="Health reports" purpose="Server reports from GET /api/reports merged with unsynced local reports from IndexedDB." />;
}
