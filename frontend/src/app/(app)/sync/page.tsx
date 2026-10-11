import type { Metadata } from "next";
import { SyncScreen } from "@/features/sync/sync-screen";

export const metadata: Metadata = { title: "Offline & sync" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <SyncScreen />;
}
