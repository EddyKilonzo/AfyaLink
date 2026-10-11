import type { Metadata } from "next";
import { UserDetailScreen } from "@/features/admin/user-detail-screen";

export const metadata: Metadata = { title: "User" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <UserDetailScreen />;
}
