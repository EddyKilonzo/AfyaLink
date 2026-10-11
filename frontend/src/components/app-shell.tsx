"use client";

import { ChevronDown, LogOut, MoreHorizontal, PanelLeftClose, PanelLeftOpen, Settings } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Logo, LogoMark } from "@/components/brand/logo";
import { EASE_OUT, PageTransition } from "@/components/motion";
import { ConnectivityBanner, SyncNotifier, SyncStatusPill, useSyncSummary } from "@/components/shell/sync-status";
import { SiteFooter } from "@/components/site/site-footer";
import { ThemeToggle } from "@/components/theme";
import { NAV, flatNav, pageTitle, type NavItem } from "@/components/shell/nav";
import { useSidebarCollapsed } from "@/components/shell/use-sidebar";
import { cx } from "@/components/ui/cx";
import { useConfirm } from "@/components/ui/dialog";
import { Sheet } from "@/components/ui/sheet";
import { useAuth } from "@/features/auth/auth-context";
import { initials, plural } from "@/lib/format";
import { HOME_BY_ROLE } from "@/lib/security";
import { ROLE_LABELS, type UserRole } from "@/types";
import { RequireAuth } from "./require-auth";

export function AppShell({ children, roles }: { children: ReactNode; roles?: UserRole[] }) {
  return (
    <RequireAuth roles={roles}>
      <ShellFrame>{children}</ShellFrame>
    </RequireAuth>
  );
}

/** Sign-out with an honest warning when reports have not reached the server. */
function useSignOut() {
  const { logout } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const { unsynced } = useSyncSummary();
  return async () => {
    if (
      unsynced > 0 &&
      !(await confirm({
        title: "Sign out with unsent reports?",
        description: `${plural(unsynced, "report")} on this device ${unsynced === 1 ? "hasn't" : "haven't"} reached the server yet. They stay here and sync the next time you sign in on this device.`,
        confirmLabel: "Sign out",
        tone: "danger",
      }))
    ) {
      return;
    }
    await logout();
    router.replace("/login");
  };
}

function ShellFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const { collapsed, toggle } = useSidebarCollapsed();
  if (!user) return null;
  const role = user.role;
  const home = HOME_BY_ROLE[role];

  return (
    <div
      className="min-h-dvh md:grid md:transition-[grid-template-columns] md:duration-300 md:ease-[var(--ease-out)]"
      style={{ gridTemplateColumns: collapsed ? "5.25rem minmax(0,1fr)" : "16.5rem minmax(0,1fr)" }}
    >
      <SyncNotifier />

      {/* Tablet/desktop sidebar: full, or a compact rail when collapsed */}
      <aside
        id="app-sidebar"
        className="sticky top-0 z-20 hidden h-dvh flex-col overflow-hidden border-r border-line bg-surface shadow-[4px_0_24px_-16px_rgb(11_61_53/0.18)] md:flex"
      >
        <div className={cx("flex h-16 shrink-0 items-center", collapsed ? "justify-center px-2" : "justify-between pl-5 pr-3")}>
          <Link href={home} aria-label="AfyaLink home" className={cx(collapsed && "hidden")}>
            <Logo />
          </Link>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="group grid size-9 place-items-center rounded-[10px] text-muted transition-colors hover:bg-sunken hover:text-ink"
          >
            {collapsed ? (
              <>
                <LogoMark className="size-9 group-hover:hidden group-focus-visible:hidden" />
                <PanelLeftOpen className="hidden size-[18px] group-hover:block group-focus-visible:block" aria-hidden />
              </>
            ) : (
              <PanelLeftClose className="size-[18px] transition-transform duration-[var(--duration-micro)] group-hover:-translate-x-0.5" aria-hidden />
            )}
            <span className="sr-only">{collapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
          </button>
        </div>
        <nav aria-label="Main" className={cx("flex-1 overflow-y-auto overflow-x-hidden py-2", collapsed ? "px-2" : "px-4")}>
          {NAV[role].map((group, gi) => (
            <div key={gi} className={cx(gi > 0 && "mt-5")}>
              {group.label && !collapsed && <p className="mb-1.5 px-3 text-xs font-medium text-muted">{group.label}</p>}
              {gi > 0 && collapsed && <div className="mx-auto mb-3 h-px w-8 bg-line" aria-hidden />}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <SideLink item={item} active={item.match(pathname)} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <SidebarFooter collapsed={collapsed} />
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-canvas/85 backdrop-blur-xl backdrop-saturate-150">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6 md:h-16 lg:px-10">
            <Link href={home} className="md:hidden" aria-label="AfyaLink home">
              <Logo />
            </Link>
            <p className="hidden truncate text-[0.9375rem] font-semibold text-ink md:block">{pageTitle(role, pathname)}</p>
            <div className="ml-auto flex items-center gap-2">
              <ThemeToggle />
              <SyncStatusPill />
              <UserMenu />
            </div>
          </div>
          <ConnectivityBanner />
        </header>

        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          <PageTransition routeKey={pathname}>{children}</PageTransition>
        </main>
        <SiteFooter variant="compact" />
      </div>

      <TabBar role={role} pathname={pathname} onMore={() => setMoreOpen(true)} />
      <MoreSheet role={role} pathname={pathname} open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

function SideLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const { Icon } = item;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? item.label : undefined}
      className={cx(
        "group relative flex rounded-[12px] font-medium transition-[background-color,color,transform] duration-[var(--duration-micro)] active:scale-[0.98]",
        collapsed ? "flex-col items-center gap-1 px-1 py-2 text-[0.6875rem]" : "items-center gap-3 px-3 py-2.5 text-sm",
        active ? "text-brand-700" : "text-muted hover:bg-sunken hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active"
          className="absolute inset-0 rounded-[12px] bg-brand-50 ring-1 ring-inset ring-brand-100"
          transition={{ duration: 0.28, ease: EASE_OUT }}
          aria-hidden
        />
      )}
      {active && (
        <motion.span
          layoutId="sidebar-bar"
          className={cx("absolute top-2 bottom-2 w-[3px] rounded-r-full bg-brand-600", collapsed ? "-left-2" : "-left-4")}
          transition={{ duration: 0.28, ease: EASE_OUT }}
          aria-hidden
        />
      )}
      <Icon className="relative size-[18px] shrink-0 transition-transform duration-[var(--duration-micro)] group-hover:scale-110" aria-hidden />
      <span className={cx("relative truncate", collapsed && "max-w-full")}>{collapsed ? (item.short ?? item.label) : item.label}</span>
    </Link>
  );
}

function SidebarFooter({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className={cx("border-t border-line", collapsed ? "p-2" : "p-4")}>
      <Link
        href="/settings"
        className={cx("flex items-center gap-3 rounded-[12px] p-1.5 transition-colors hover:bg-sunken", collapsed && "justify-center")}
        title="Settings"
      >
        <Avatar name={user.fullName} />
        <span className={cx("min-w-0", collapsed && "hidden")}>
          <span className="block truncate text-sm font-semibold text-ink">{user.fullName}</span>
          <span className="block truncate text-xs text-muted">{ROLE_LABELS[user.role]}</span>
        </span>
      </Link>
    </div>
  );
}

function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-full bg-brand-600 font-semibold text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]",
        size === "md" ? "size-9 text-xs" : "size-11 text-sm",
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Account menu: a popover on tablet/desktop, the "More" sheet covers phones. */
function UserMenu() {
  const { user } = useAuth();
  const signOut = useSignOut();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!user) return null;
  return (
    <div ref={ref} className="relative hidden md:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-1.5 rounded-full p-0.5 pr-2 transition-colors hover:bg-sunken"
      >
        <Avatar name={user.fullName} />
        <ChevronDown className={cx("size-4 text-muted transition-transform duration-[var(--duration-ui)]", open && "rotate-180")} aria-hidden />
        <span className="sr-only">Account menu</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98, transition: { duration: 0.12 } }}
            transition={{ duration: 0.18, ease: EASE_OUT }}
            className="absolute right-0 top-[calc(100%+8px)] z-40 w-64 origin-top-right rounded-2xl bg-surface p-1.5 shadow-[var(--shadow-ring),var(--shadow-lg)]"
          >
            <div className="px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
              <p className="truncate text-xs text-muted">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link
              role="menuitem"
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-sunken"
            >
              <Settings className="size-4 text-muted" aria-hidden /> Settings
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false);
                void signOut();
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-ink hover:bg-sunken"
            >
              <LogOut className="size-4 text-muted" aria-hidden /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Phone dock: spring-lifted bottom bar with a raised primary action. */
  function TabBar({ role, pathname, onMore }: { role: UserRole; pathname: string; onMore: () => void }) {
    const tabs = flatNav(role).filter((i) => i.tab).slice(0, 4);
    const { unsynced } = useSyncSummary();
    const moreActive = flatNav(role).some((i) => !i.tab && i.match(pathname));

    return (
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 md:hidden"
      >
        {/* Dock: lifted, rounded, with a soft contact shadow */}
        <div className="mx-auto mb-3 w-[calc(100%-2rem)] max-w-md">
          <div className="flex items-center justify-between gap-1 rounded-[22px] border border-line/80 bg-surface/92 p-1.5 shadow-[var(--shadow-xl)] backdrop-blur-xl backdrop-saturate-150">
            {tabs.map((item) => {
              const active = item.match(pathname);
              if (item.primary) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    aria-label={item.label}
                    className="grid size-12 place-items-center rounded-[16px] bg-brand-600 text-white shadow-[0_8px_20px_-8px_rgb(20_108_90/0.7),inset_0_1px_0_rgb(255_255_255/0.18)] transition-transform duration-[var(--duration-micro)] ease-[var(--ease-out)] active:scale-90"
                  >
                    <item.Icon className="size-6" aria-hidden />
                  </Link>
                );
              }
              return (
                <TabLink key={item.href} href={item.href} label={item.short ?? item.label} active={active} Icon={item.Icon} badge={item.href === "/sync" ? unsynced : 0} />
              );
            })}
            <button
              type="button"
              onClick={onMore}
              className={cx("grid size-12 place-items-center rounded-[16px] transition-colors", moreActive ? "text-brand-700" : "text-muted hover:text-ink")}
              aria-label="More"
              aria-expanded={moreActive}
            >
              <MoreHorizontal className="size-[22px]" aria-hidden />
            </button>
          </div>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" aria-hidden />
      </nav>
    );
  }

function TabLink({ href, label, active, Icon, badge }: { href: string; label: string; active: boolean; Icon: NavItem["Icon"]; badge: number }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cx(
        "relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 text-[0.625rem] font-medium transition-colors",
        active ? "text-brand-700" : "text-muted hover:text-ink",
      )}
    >
      {active && (
        <motion.span
          layoutId="tab-active"
          className="absolute -inset-1.5 rounded-[14px] bg-brand-50"
          transition={{ duration: 0.26, ease: EASE_OUT }}
          aria-hidden
        />
      )}
      <span className="relative">
        <Icon className="size-[22px]" aria-hidden />
        {badge > 0 && (
          <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber px-1 text-[0.625rem] font-bold text-brand-950 ring-2 ring-surface">
            {badge > 9 ? "9+" : badge}
            <span className="sr-only"> waiting to sync</span>
          </span>
        )}
      </span>
      <span className="relative">{label}</span>
    </Link>
  );
}

function MoreSheet({ role, pathname, open, onClose }: { role: UserRole; pathname: string; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const signOut = useSignOut();
  const items = flatNav(role).filter((i) => !i.tab);
  if (!user) return null;
  return (
    <Sheet open={open} onClose={onClose} title="More">
      <div className="mx-2 mb-3 flex items-center gap-3 rounded-2xl bg-sunken p-3">
        <Avatar name={user.fullName} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{user.fullName}</p>
          <p className="truncate text-xs text-muted">{ROLE_LABELS[user.role]}</p>
        </div>
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const active = item.match(pathname);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex min-h-12 items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium",
                  active ? "bg-brand-50 text-brand-700" : "text-ink hover:bg-sunken",
                )}
              >
                <item.Icon className="size-5 text-muted" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="mt-2 border-t border-line pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              void signOut();
            }}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-[0.9375rem] font-medium text-error hover:bg-failed-bg"
          >
            <LogOut className="size-5" aria-hidden /> Sign out
          </button>
        </li>
      </ul>
    </Sheet>
  );
}
