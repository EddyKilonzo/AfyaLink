import type { Metadata } from "next";
import { UsersScreen } from "@/features/admin/users-screen";

export const metadata: Metadata = { title: "Users" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <UsersScreen />;
}
