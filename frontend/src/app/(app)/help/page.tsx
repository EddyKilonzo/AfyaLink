import type { Metadata } from "next";
import { HelpScreen } from "@/features/help/help-screen";

export const metadata: Metadata = { title: "Help" };
export const instant = false;

export default function Page() {
  return <HelpScreen />;
}