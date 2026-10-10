import type { Metadata } from "next";
import { RoutePlaceholder } from "@/components/route-placeholder";

export const metadata: Metadata = { title: "Sign in" };

export default function Page() {
  return <RoutePlaceholder title="Sign in" purpose="CHV and administrator sign-in. Uses useAuth().login (HTTP-only session cookie + CSRF)." />;
}
