import {
  ClipboardCheck,
  FilePlus2,
  FileText,
  LayoutDashboard,
  Map,
  MapPin,
  RefreshCw,
  ScrollText,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface NavItem {
  href: string;
  label: string;
  /** Label in the phone tab bar, where space is tight. */
  short?: string;
  Icon: LucideIcon;
  /** Decides whether the item is active for a path. */
  match: (path: string) => boolean;
  /** Shown as a tab in the phone tab bar (others go under "More"). */
  tab?: boolean;
  /** The one emphasised action in the phone tab bar. */
  primary?: boolean;
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

const exact = (href: string) => (path: string) => path === href;
const within = (href: string) => (path: string) => path === href || path.startsWith(`${href}/`);
const reportPages = (path: string) => path === "/reports" || (path.startsWith("/reports/") && !path.startsWith("/reports/new"));

const MAP: NavItem = { href: "/maps", label: "Disease map", short: "Map", Icon: Map, match: within("/maps") };
const SYNC: NavItem = { href: "/sync", label: "Sync & offline", short: "Sync", Icon: RefreshCw, match: within("/sync") };
const SETTINGS: NavItem = { href: "/settings", label: "Settings", Icon: Settings, match: within("/settings") };

export const NAV: Record<UserRole, NavGroup[]> = {
  CHV: [
    {
      items: [
        { href: "/dashboard", label: "Home", Icon: LayoutDashboard, match: exact("/dashboard"), tab: true },
        { href: "/reports", label: "My reports", short: "Reports", Icon: FileText, match: reportPages, tab: true },
        { href: "/reports/new", label: "New report", short: "New", Icon: FilePlus2, match: within("/reports/new"), tab: true, primary: true },
        { ...SYNC, tab: true },
        MAP,
      ],
    },
    { label: "Account", items: [SETTINGS] },
  ],
  ADMIN: [
    {
      items: [
        { href: "/admin", label: "Overview", short: "Home", Icon: LayoutDashboard, match: exact("/admin"), tab: true },
        {
          href: "/admin/reports",
          label: "Report review",
          short: "Review",
          Icon: ClipboardCheck,
          match: (p) => within("/admin/reports")(p) || reportPages(p),
          tab: true,
        },
        { ...MAP, tab: true },
      ],
    },
    {
      label: "Manage",
      items: [
        { href: "/admin/users", label: "Users", Icon: Users, match: within("/admin/users"), tab: true },
        { href: "/admin/locations", label: "Locations", Icon: MapPin, match: within("/admin/locations") },
        { href: "/admin/audit", label: "Audit log", Icon: ScrollText, match: within("/admin/audit") },
      ],
    },
    { label: "Account", items: [SYNC, SETTINGS] },
  ],
};

export function flatNav(role: UserRole): NavItem[] {
  return NAV[role].flatMap((g) => g.items);
}

/** Title for the top bar: the active nav item, or a sensible fallback. */
export function pageTitle(role: UserRole, path: string): string {
  if (path.startsWith("/reports/new")) return "New report";
  if (/^\/reports\/[^/]+\/edit$/.test(path)) return "Correct report";
  if (/^\/reports\/[^/]+$/.test(path)) return "Report";
  return flatNav(role).find((item) => item.match(path))?.label ?? "AfyaLink";
}
