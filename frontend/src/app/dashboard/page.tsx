import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = { title: "CHV dashboard" };

export default function Page() {
  return <RoutePlaceholder title="CHV dashboard" purpose="Personal summary from GET /api/analytics/summary plus the local offline queue counts from useSync()." />;
}
