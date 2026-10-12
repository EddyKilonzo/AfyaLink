import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { cx } from "@/components/ui/cx";

const LINKS = [
  { href: "/dashboard", label: "Home" },
  { href: "/reports", label: "Reports" },
  { href: "/maps", label: "Disease map" },
  { href: "/sync", label: "Sync" },
  { href: "/help", label: "Help" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/**
 * Global site footer. Rendered by every layout (marketing, login, offline)
 * so no page has to import it. Compact on narrow screens, full on desktop.
 */
export function SiteFooter({ variant = "full" }: { variant?: "full" | "compact" }) {
  return (
    <footer className="border-t border-line bg-surface">
      <div
        className={cx(
          "mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8",
          variant === "compact" ? "py-8" : "py-12",
        )}
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2">
              <LogoMark className="size-9 rounded-[12px]" />
              <span className="text-lg font-semibold tracking-tight text-ink">AfyaLink</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              Community health reporting that works offline. Volunteers record in under a minute; the data reaches
              administrators the moment the connection returns.
            </p>
          </div>

          <nav aria-label="Product" className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <div className="flex flex-col gap-2">
              <span className="text-label">Product</span>
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="text-muted transition-colors hover:text-ink">
                  {l.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-label">For teams</span>
              <Link href="/admin" className="text-muted transition-colors hover:text-ink">
                Administrator overview
              </Link>
              <Link href="/admin/users" className="text-muted transition-colors hover:text-ink">
                Manage users
              </Link>
              <Link href="/admin/audit" className="text-muted transition-colors hover:text-ink">
                Audit log
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-label">Legal</span>
              {LEGAL.map((l) => (
                <Link key={l.href} href={l.href} className="text-muted transition-colors hover:text-ink">
                  {l.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            Academic prototype. Development data is synthetic and is not connected to any national health information
            system.
          </p>
          <p className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-synced" aria-hidden /> Reports saved offline sync automatically
          </p>
        </div>
      </div>
    </footer>
  );
}