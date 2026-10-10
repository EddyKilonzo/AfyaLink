"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-context";
import type { UserRole } from "@/types";
import { Spinner } from "./ui";

/**
 * Client-side gate for a better UX only. Every protected API endpoint is
 * independently authenticated and role-checked by the backend.
 */
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "anonymous") router.replace("/login");
  }, [status, router]);

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label={status === "anonymous" ? "Redirecting to sign in" : "Checking your session"} />
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <ShieldAlert className="size-10 text-failed" aria-hidden />
        <h1 className="font-display text-xl font-semibold">Access restricted</h1>
        <p className="max-w-sm text-sm text-muted">This page is only available to administrators.</p>
        <Link href="/dashboard" className="text-sm font-semibold text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
