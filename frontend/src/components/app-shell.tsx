"use client";

import {
  CloudOff,
  FilePlus2,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Map,
  RefreshCw,
  ShieldCheck,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { useSync } from "@/features/sync/sync-context";
import type { UserRole } from "@/types";
import { RequireAuth } from "./require-auth";
import { cx } from "./ui";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof LayoutDashboard;
  roles?: UserRole[];
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/reports", label: "Reports", Icon: FileText },
  { href: "/reports/new", label: "New report", Icon: FilePlus2 },
  { href: "/sync", label: "Sync", Icon: RefreshCw },
  { href: "/maps", label: "Maps", Icon: Map },
  { href: "/admin", label: "Admin", Icon: ShieldCheck, roles: ["ADMIN"] },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/reports") return pathname === "/reports";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  return (
    <RequireAuth roles={roles}>
      <ShellFrame>{children}</ShellFrame>
    </RequireAuth>
  );
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, offlineSession } = useAuth();
  const { online, counts, isSyncing } = useSync();
  const [signingOut, setSigningOut] = useState(false);
  const unsynced = counts.pending + counts.failed + counts.syncing;
  const items = NAV.filter((item) => !item.roles || (user && item.roles.includes(user.role)));

  async function handleLogout() {
    if (
      unsynced > 0 &&
      !window.confirm(
        `${unsynced} report(s) have not reached the server yet. They stay on this device and will sync next time you sign in. Sign out anyway?`,
      )
    ) {
      return;
    }
    setSigningOut(true);
    try {
      await logout();
      router.replace("/login");
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="hidden border-r border-line bg-surface lg:flex lg:min-h-dvh lg:flex-col lg:p-4">
        <Link href="/dashboard" className="mb-8 flex items-center gap-2 px-2 font-display text-lg font-semibold text-brand-700">
          <HeartPulse className="size-6" aria-hidden /> AfyaLink
        </Link>
        <nav aria-label="Main" className="flex flex-col gap-1">
          {items.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cx(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive(pathname, href) ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-brand-50 hover:text-ink",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {label}
              {href === "/sync" && unsynced > 0 && (
                <span className="ml-auto rounded-full bg-pending-bg px-2 text-xs font-semibold text-pending">{unsynced}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="mt-auto border-t border-line pt-4 text-sm">
          <p className="truncate font-semibold text-ink">{user?.fullName}</p>
          <p className="text-xs text-muted">{user?.role === "ADMIN" ? "Administrator" : "Community Health Volunteer"}</p>
          <button
            onClick={handleLogout}
            disabled={signingOut}
            className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-ink disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-canvas/90 px-4 py-3 backdrop-blur lg:px-8">
          <Link href="/dashboard" className="flex items-center gap-2 font-display font-semibold text-brand-700 lg:hidden">
            <HeartPulse className="size-5" aria-hidden /> AfyaLink
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <ConnectivityPill online={online} isSyncing={isSyncing} unsynced={unsynced} />
            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="rounded-lg p-2 text-muted hover:bg-brand-50 hover:text-ink lg:hidden"
              aria-label="Sign out"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </div>
        </header>

        {(!online || offlineSession) && (
          <div role="status" className="border-b border-pending/20 bg-pending-bg px-4 py-2 text-sm text-pending lg:px-8">
            You are offline. New reports are saved on this device and will sync automatically when the connection returns.
          </div>
        )}

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
      >
        {items.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={isActive(pathname, href) ? "page" : undefined}
            className={cx(
              "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
              isActive(pathname, href) ? "text-brand-700" : "text-muted",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label.replace("New report", "New")}
            {href === "/sync" && unsynced > 0 && (
              <span className="absolute right-1/4 top-1 size-2 rounded-full bg-pending" aria-label={`${unsynced} unsynced`} />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function ConnectivityPill({ online, isSyncing, unsynced }: { online: boolean; isSyncing: boolean; unsynced: number }) {
  const label = !online ? "Offline" : isSyncing ? "Syncing…" : unsynced > 0 ? `${unsynced} to sync` : "All synced";
  return (
    <Link
      href="/sync"
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        !online ? "bg-pending-bg text-pending" : unsynced > 0 ? "bg-syncing-bg text-syncing" : "bg-synced-bg text-synced",
      )}
    >
      {online ? <Wifi className="size-3.5" aria-hidden /> : <CloudOff className="size-3.5" aria-hidden />}
      {label}
    </Link>
  );
}
