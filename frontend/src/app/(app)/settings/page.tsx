import type { Metadata } from "next";
import { SettingsScreen } from "@/features/account/settings-screen";

export const metadata: Metadata = { title: "Settings" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <SettingsScreen />;
}
