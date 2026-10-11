import Link from "next/link";
import { HexTexture } from "@/components/brand/hex-texture";
import { Logo } from "@/components/brand/logo";
import { cx } from "@/components/ui/cx";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#impact", label: "Community impact" },
  { href: "/login", label: "Sign in" },
];

/**
 * Shared footer. `full` on public pages; `compact` (one line) inside the
 * signed-in app and on focused pages such as sign-in.
 */
export function SiteFooter({ variant = "full", className }: { variant?: "full" | "compact"; className?: string }) {
  if (variant === "compact") {
    return (
      <footer className={cx("bg-brand-950 text-brand-200", className)}>
        <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
          <p>AfyaLink, community health reporting that works offline.</p>
          <p>Academic prototype. Development data is synthetic.</p>
        </div>
      </footer>
    );
  }

  return (
    <footer className={cx("relative overflow-hidden bg-brand-950 text-white", className)}>
      <HexTexture tone="dark" glow={false} />
      <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-5 py-14 sm:px-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="mt-4 text-sm leading-relaxed text-brand-200">From community reports to faster health action. An academic prototype; development data is synthetic.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-brand-200 transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="relative border-t border-white/10">
        <p className="mx-auto max-w-7xl px-5 py-5 text-xs text-brand-200 sm:px-8">AfyaLink. Built for community health volunteers in rural Kenya.</p>
      </div>
    </footer>
  );
}
