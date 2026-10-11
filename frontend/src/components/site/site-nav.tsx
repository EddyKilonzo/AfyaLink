"use client";

import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/logo";
import { EASE_OUT } from "@/components/motion";
import { ButtonLink } from "@/components/ui";
import { cx } from "@/components/ui/cx";

const LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#impact", label: "Community impact" },
];

/** `overDark`: page starts with a dark hero, so the bar is light-on-dark until scrolled. */
export function SiteNav({ overDark = false }: { overDark?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const light = overDark && !scrolled && !open;
  return (
    <header
      className={cx(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-[var(--duration-ui)]",
        scrolled || open ? "bg-canvas/80 shadow-[var(--shadow-md)] backdrop-blur-xl backdrop-saturate-150" : "bg-transparent",
      )}
    >
      <nav aria-label="Site" className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Link href="/" aria-label="AfyaLink home" className="shrink-0">
          <Logo tone={light ? "light" : "brand"} />
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className={cx(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  light ? "text-brand-100 hover:bg-white/10 hover:text-white" : "text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/login"
            className={cx(
              "hidden rounded-lg px-3 py-2 text-sm font-semibold transition-colors sm:inline-flex",
              light ? "text-white hover:bg-white/10" : "text-ink hover:bg-sunken",
            )}
          >
            Sign in
          </Link>
          <ButtonLink href="/login" size="sm" variant={light ? "inverse" : "primary"} className="max-sm:hidden">
            Get started
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={cx("grid size-10 place-items-center rounded-[10px] transition-colors md:hidden", light ? "text-white hover:bg-white/10" : "text-ink hover:bg-sunken")}
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="overflow-hidden border-t border-line md:hidden"
          >
            <ul className="space-y-1 px-5 pb-5 pt-3">
              {LINKS.map((l, i) => (
                <motion.li key={l.href} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.24, ease: EASE_OUT }}>
                  <a href={l.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 text-base font-medium text-ink hover:bg-sunken">
                    {l.label}
                  </a>
                </motion.li>
              ))}
              <li className="grid grid-cols-2 gap-2 pt-3">
                <ButtonLink href="/login" variant="outline" size="lg">
                  Sign in
                </ButtonLink>
                <ButtonLink href="/login" size="lg">
                  Get started
                </ButtonLink>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
