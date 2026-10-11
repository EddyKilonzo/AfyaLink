"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { HOME_BY_ROLE, loginUrlFor } from "@/lib/security";
import type { UserRole } from "@/types";
import { LogoMark } from "./brand/logo";
import { buttonClass } from "./ui";

/**
 * Client-side gate for a better UX only. Every protected API endpoint is
 * independently authenticated and role-checked by the backend, so nothing
 * here is a security boundary on its own.
 */
export function RequireAuth({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  const { status, user, sessionExpired } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status !== "anonymous") return;
    const target = loginUrlFor(pathname, window.location.search);
    router.replace(sessionExpired ? `${target}${target.includes("?") ? "&" : "?"}expired=1` : target);
  }, [status, sessionExpired, pathname, router]);

  if (status !== "authenticated" || !user) {
    return (
      <div role="status" className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <LogoMark className="size-12 animate-pulse-soft rounded-[14px]" />
        <p className="text-sm text-muted">{status === "anonymous" ? "Taking you to sign in…" : "Checking your session…"}</p>
      </div>
    );
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-failed-bg text-failed">
          <ShieldAlert className="size-6" aria-hidden />
        </span>
        <h1 className="text-h1">This page is for administrators</h1>
        <p className="max-w-sm text-sm text-muted">Your account doesn&apos;t have access. If you need it, ask your health team administrator.</p>
        <Link href={HOME_BY_ROLE[user.role]} className={buttonClass("outline", "md", "mt-2")}>
          Back to your dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}

/** Renders children only for the given roles (for buttons/sections inside a page). */
export function RoleGate({ roles, children, fallback = null }: { roles: UserRole[]; children: ReactNode; fallback?: ReactNode }) {
  const { user } = useAuth();
  return <>{user && roles.includes(user.role) ? children : fallback}</>;
}
