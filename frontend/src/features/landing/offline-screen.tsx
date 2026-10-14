"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { EASE_OUT } from "@/components/motion";
import { CloudOff, FilePlus2, MapPinned, RefreshCw, Smartphone, Wifi } from "lucide-react";

/**
 * Shown when the service worker redirects to an unvisited dynamic page while
 * offline, or when the user navigates here on purpose. It is a soft landing
 * that keeps the app shell usable: the queue and the map are still open from
 * the device, and the buttons go to places that work without a connection.
 */
export function OfflineScreen() {
  return (
    <main id="main" className="min-h-dvh">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(120%_80%_at_50%_-10%,var(--color-brand-100)_0%,var(--color-surface)_60%)]" aria-hidden />
        <div className="mx-auto flex max-w-3xl flex-col items-center px-5 py-20 text-center sm:py-28">
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
            className="grid size-20 place-items-center rounded-[24px] bg-amber-soft text-amber-ink ring-1 ring-inset ring-amber/40"
          >
            <CloudOff className="size-9" aria-hidden />
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.08 }}
            className="mt-6 text-3xl font-semibold tracking-tight text-ink sm:text-[2.25rem]"
          >
            You&apos;re offline
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.14 }}
            className="mt-3 max-w-xl text-muted"
          >
            Reports saved on this device are safe. They upload automatically when the connection returns, and each one is confirmed by the server before
            it leaves the queue.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE_OUT, delay: 0.2 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <ButtonLink href="/reports/new" size="lg" icon={<FilePlus2 className="size-4" aria-hidden />}>
              Record a report
            </ButtonLink>
            <ButtonLink href="/sync" variant="outline" size="lg" icon={<RefreshCw className="size-4" aria-hidden />}>
              View sync queue
            </ButtonLink>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.28 }}
            className="mt-14 grid w-full max-w-2xl gap-4 text-left sm:grid-cols-3"
          >
            <li className="rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-inset ring-line">
              <Smartphone className="size-6 text-brand-600" aria-hidden />
              <h3 className="mt-3 font-semibold text-ink">Saved on this phone</h3>
              <p className="mt-1.5 text-sm text-muted">Nothing is lost when the network disappears.</p>
            </li>
            <li className="rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-inset ring-line">
              <Wifi className="size-6 text-brand-600" aria-hidden />
              <h3 className="mt-3 font-semibold text-ink">Auto-syncs later</h3>
              <p className="mt-1.5 text-sm text-muted">Uploads resume on their own when you reconnect.</p>
            </li>
            <li className="rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-card)] ring-1 ring-inset ring-line">
              <MapPinned className="size-6 text-brand-600" aria-hidden />
              <h3 className="mt-3 font-semibold text-ink">Map still works</h3>
              <p className="mt-1.5 text-sm text-muted">See your own reports and areas, even without tiles.</p>
            </li>
          </motion.ul>

          <p className="mt-10 text-xs text-muted">
            Still stuck? {" "}
            <Link href="/sync" className="font-semibold text-brand-600 hover:underline">
              Open the sync page
            </Link>
            {" "}to see exactly what is waiting.
          </p>
        </div>
      </div>
    </main>
  );
}