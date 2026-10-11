import type { Metadata } from "next";
import { UserCreateScreen } from "@/features/admin/user-create-screen";

export const metadata: Metadata = { title: "New user" };
// Renders after the client-side session check; see (app)/layout.tsx.
export const instant = false;

export default function Page() {
  return <UserCreateScreen />;
}
