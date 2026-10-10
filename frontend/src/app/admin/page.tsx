import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = { title: "Administrator dashboard" };

export default function Page() {
  return <RoutePlaceholder title="Administrator dashboard" purpose="ADMIN-only analytics (Recharts) and user list from GET /api/users. Enforced by the backend." />;
}
