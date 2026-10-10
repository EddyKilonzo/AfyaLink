import Link from "next/link";

const ROUTES = [
  ["/", "Home"],
  ["/login", "Login"],
  ["/dashboard", "Dashboard"],
  ["/reports", "Reports"],
  ["/reports/new", "New report"],
  ["/sync", "Sync"],
  ["/maps", "Maps"],
  ["/admin", "Admin"],
] as const;

/**
 * Temporary page body used until the agreed UI design is implemented.
 * Data, offline storage, sync and auth logic already live in src/features,
 * src/services and src/lib and are ready to be wired into the final screens.
 */
export function RoutePlaceholder({ title, purpose }: { title: string; purpose: string }) {
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">AfyaLink · UI pending design</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">{title}</h1>
      <p className="mt-3 text-muted">{purpose}</p>
      <nav aria-label="Routes" className="mt-8 flex flex-wrap gap-2 text-sm">
        {ROUTES.map(([href, label]) => (
          <Link key={href} href={href} className="rounded-lg border border-line bg-surface px-3 py-1.5 hover:bg-brand-50">
            {label}
          </Link>
        ))}
      </nav>
    </main>
  );
}
