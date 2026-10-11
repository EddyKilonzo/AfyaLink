import type { Metadata } from "next";
import { LocationsScreen } from "@/features/admin/locations-screen";

export const metadata: Metadata = { title: "Locations" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <LocationsScreen />;
}
