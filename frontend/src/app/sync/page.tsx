import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = { title: "Offline & sync status" };

export default function Page() {
  return <RoutePlaceholder title="Offline & sync status" purpose="Local queue with pending / syncing / synced / failed states and a manual sync action." />;
}
