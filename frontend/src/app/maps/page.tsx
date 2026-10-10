import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = { title: "Disease maps" };

export default function Page() {
  return <RoutePlaceholder title="Disease maps" purpose="Leaflet map of reports with coordinates. Demo points must be labelled as demo data." />;
}
