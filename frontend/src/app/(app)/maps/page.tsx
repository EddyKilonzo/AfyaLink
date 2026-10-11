import type { Metadata } from "next";
import { MapsScreen } from "@/features/analytics/maps-screen";

export const metadata: Metadata = { title: "Disease map" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <MapsScreen />;
}
