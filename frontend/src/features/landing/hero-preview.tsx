"use client";

import { CheckCircle2, Clock, CloudOff, FilePlus2, RefreshCw, Signal, Wifi } from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useState, type PointerEvent } from "react";
import { LogoMark } from "@/components/brand/logo";
import { EASE_OUT } from "@/components/motion";
import { DemoBadge } from "@/components/ui";
import { cx } from "@/components/ui/cx";

/**
 * Illustrative, self-running demo of the offline-first loop (synthetic data,
 * clearly labelled): a report waits on an offline phone, travels to the
 * server when the connection returns, and lands on the admin dashboard.
 */

type Phase = "offline" | "syncing" | "synced";

const DEMO_REPORTS = [
  { condition: "Acute watery diarrhoea", meta: "Disease case, 6 cases, yesterday", place: "Mutomo", severity: "HIGH" as const, status: "Submitted" as const },
  { condition: "Malaria", meta: "Disease case, 4 cases, 2 days ago", place: "Miambani", severity: "MODERATE" as const, status: "Submitted" as const },
  { condition: "Contaminated borehole", meta: "Water & sanitation, 1 case, 5 days ago", place: "Kyuso", severity: "HIGH" as const, status: "Reviewed" as const },
  { condition: "Missed immunisation", meta: "Child health, 3 cases, last week", place: "Ikanga", severity: "MODERATE" as const, status: "Submitted" as const },
  { condition: "Missed antenatal visit", meta: "Maternal health, 2 cases, last week", place: "Kyuso", severity: "MODERATE" as const, status: "Submitted" as const },
];

const PHASE_MS: Record<Phase, number> = { offline: 3200, syncing: 2000, synced: 3400 };
const BARS = [32, 48, 40, 62, 54, 70, 58];

function useDemoLoop() {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>(reduce ? "synced" : "offline");
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const next: Phase = phase === "offline" ? "syncing" : phase === "syncing" ? "synced" : "offline";
    const timer = setTimeout(() => {
      if (next === "offline") setCycle((c) => c + 1);
      setPhase(next);
    }, PHASE_MS[phase]);
    return () => clearTimeout(timer);
  }, [phase, reduce]);

  return { phase, cycle, reduce };
}

export function HeroPreview() {
  const { phase, cycle, reduce } = useDemoLoop();
  const current = DEMO_REPORTS[cycle % DEMO_REPORTS.length] as (typeof DEMO_REPORTS)[number];
  const received = 128 + cycle + (phase === "synced" ? 1 : 0);
  const delivered = DEMO_REPORTS.slice(0, (cycle % DEMO_REPORTS.length) + (phase === "synced" ? 1 : 0)).reverse();

  // Gentle tilt toward the pointer on devices with a fine pointer.
  const rx = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 });
  const ry = useSpring(useMotionValue(0), { stiffness: 120, damping: 20 });
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 5);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 4);
  }

  return (
    <div className="relative [perspective:1600px]" onPointerMove={onPointerMove} onPointerLeave={() => (rx.set(0), ry.set(0))}>
      <motion.div style={{ rotateX: rx, rotateY: ry }} className="relative mx-auto h-[33rem] max-w-[36rem] [transform-style:preserve-3d] sm:h-[35rem] lg:max-w-none">
        <DemoBadge label="Illustrative demo" className="absolute left-2 top-0 z-20 lg:left-0" />

        {/* Admin dashboard window (tablet and up) */}
        <AdminWindow phase={phase} received={received} delivered={delivered} />

        {/* The link: drawn as the report travels */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full md:block" aria-hidden>
          <path d="M24 62 Q 48 22 72 52" fill="none" stroke="var(--color-line-strong)" strokeWidth="1.5" strokeDasharray="4 5" vectorEffect="non-scaling-stroke" />
          <motion.path
            d="M24 62 Q 48 22 72 52"
            fill="none"
            stroke="var(--color-brand-500)"
            strokeWidth="2"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={false}
            animate={{ pathLength: phase === "offline" ? 0 : 1, opacity: phase === "synced" ? 0.35 : 1 }}
            transition={{ duration: phase === "syncing" ? 1.6 : 0.4, ease: EASE_OUT }}
          />
        </svg>
        <AnimatePresence>
          {phase === "syncing" && (
            <motion.span
              key={`token-${cycle}`}
              className="absolute z-20 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-surface px-2.5 py-1 text-[0.6875rem] font-semibold text-ink shadow-[var(--shadow-ring),var(--shadow-md)] md:inline-flex"
              initial={{ left: "24%", top: "62%", opacity: 0, scale: 0.8 }}
              animate={{ left: ["24%", "36%", "48%", "60%", "72%"], top: ["62%", "46.4%", "39.5%", "41.4%", "52%"], opacity: [0, 1, 1, 1, 0], scale: [0.8, 1, 1, 1, 0.9] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.6, ease: "easeInOut" }}
            >
              <span className="size-2 rounded-full bg-amber" aria-hidden />
              1 report
            </motion.span>
          )}
        </AnimatePresence>

        {/* Volunteer phone */}
        <Phone phase={phase} current={current} />
      </motion.div>

      {/* Screen-reader summary of what the animation shows */}
      <p className="sr-only" aria-live="off">
        Illustration: a volunteer&apos;s phone saves a report while offline, then sends it to the AfyaLink server when the connection returns, where it
        appears on the administrator dashboard.
      </p>
    </div>
  );
}

function Phone({ phase, current }: { phase: Phase; current: (typeof DEMO_REPORTS)[number] }) {
  const status = {
    offline: { label: "Offline, 1 saved", Icon: CloudOff, tone: "bg-amber-soft text-amber-ink ring-amber/40" },
    syncing: { label: "Syncing", Icon: RefreshCw, tone: "bg-syncing-bg text-syncing ring-syncing/15" },
    synced: { label: "All synced", Icon: CheckCircle2, tone: "bg-synced-bg text-synced ring-synced/15" },
  }[phase];
  const badge = {
    offline: { label: "Waiting", Icon: Clock, tone: "bg-amber-soft text-amber-ink" },
    syncing: { label: "Syncing", Icon: RefreshCw, tone: "bg-syncing-bg text-syncing" },
    synced: { label: "Synced", Icon: CheckCircle2, tone: "bg-synced-bg text-synced" },
  }[phase];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.35 }}
      className="absolute bottom-0 left-1/2 z-30 w-[15.5rem] -translate-x-1/2 md:left-[4%] md:translate-x-0"
      style={{ transform: "translateZ(40px)" }}
    >
      <div className="rounded-[2.6rem] bg-brand-950 p-2 shadow-[var(--shadow-xl)] ring-1 ring-white/10">
        <div className="relative h-[29.5rem] overflow-hidden rounded-[2.1rem] bg-canvas">
          {/* status bar */}
          <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[0.625rem] font-semibold text-ink">
            <span>9:41</span>
            <span className="h-4 w-16 rounded-full bg-brand-950" aria-hidden />
            <span className="flex items-center gap-1 text-muted">
              {phase === "offline" ? <CloudOff className="size-3" aria-hidden /> : <Wifi className="size-3" aria-hidden />}
              <Signal className={cx("size-3", phase === "offline" && "opacity-30")} aria-hidden />
            </span>
          </div>

          {/* toast inside the phone when the server confirms */}
          <AnimatePresence>
            {phase === "synced" && (
              <motion.div
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
                className="absolute inset-x-3 top-9 z-10 flex items-center gap-2 rounded-2xl bg-surface p-2.5 shadow-[var(--shadow-ring),var(--shadow-lg)]"
              >
                <span className="grid size-7 place-items-center rounded-lg bg-synced-bg text-synced">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                </span>
                <span className="text-[0.6875rem] leading-tight">
                  <span className="block font-semibold text-ink">1 report synced</span>
                  <span className="text-muted">The server confirmed receipt.</span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="px-4 pt-4">
            <div className="flex items-center justify-between">
              <LogoMark className="size-6" />
              <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.625rem] font-semibold ring-1 ring-inset transition-colors duration-300", status.tone)}>
                <status.Icon className={cx("size-2.5", phase === "syncing" && "animate-spin")} aria-hidden />
                {status.label}
              </span>
            </div>
            <p className="mt-4 text-[0.6875rem] text-muted">Good morning,</p>
            <p className="text-base font-semibold tracking-tight text-ink">Amina</p>

            <div className="mt-3 rounded-2xl bg-brand-900 p-3 text-white">
              <p className="text-[0.625rem] text-brand-200">This week</p>
              <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">12 reports</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-[0.625rem] font-semibold text-brand-900">
                <FilePlus2 className="size-3" aria-hidden /> New health report
              </span>
            </div>

            <p className="mb-1.5 mt-4 text-[0.625rem] font-semibold text-muted">Recent</p>
            <div className="space-y-1.5">
              <motion.div layout className="flex items-center gap-2 rounded-xl bg-surface p-2 shadow-[var(--shadow-ring)]">
                <span className="size-6 shrink-0 rounded-lg bg-brand-50 ring-1 ring-brand-100" aria-hidden />
                <span className="min-w-0 flex-1">
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={current.condition} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="block truncate text-[0.6875rem] font-semibold text-ink">
                      {current.condition}
                    </motion.span>
                  </AnimatePresence>
                  <span className="block truncate text-[0.5625rem] text-muted">{current.meta}</span>
                </span>
                <span className={cx("inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.5625rem] font-semibold transition-colors duration-300", badge.tone)}>
                  <badge.Icon className={cx("size-2.5", phase === "syncing" && "animate-spin")} aria-hidden />
                  {badge.label}
                </span>
              </motion.div>
              {["Pneumonia", "Contaminated water source"].map((c) => (
                <div key={c} className="flex items-center gap-2 rounded-xl bg-surface p-2 opacity-70 shadow-[var(--shadow-ring)]">
                  <span className="size-6 shrink-0 rounded-lg bg-sunken" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[0.6875rem] font-medium text-ink">{c}</span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-synced-bg px-1.5 py-0.5 text-[0.5625rem] font-semibold text-synced">
                    <CheckCircle2 className="size-2.5" aria-hidden />
                    Synced
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function AdminWindow({ phase, received, delivered }: { phase: Phase; received: number; delivered: (typeof DEMO_REPORTS)[number][] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.15 }}
      className="absolute right-0 top-8 hidden w-[78%] overflow-hidden rounded-[1.4rem] bg-surface shadow-[var(--shadow-ring),var(--shadow-xl)] md:block"
    >
      <div className="flex items-center gap-1.5 border-b border-line bg-canvas px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-line-strong" aria-hidden />
        <span className="size-2.5 rounded-full bg-line-strong" aria-hidden />
        <span className="size-2.5 rounded-full bg-line-strong" aria-hidden />
        <span className="ml-3 text-[0.6875rem] font-medium text-muted">Administrator overview</span>
      </div>
      <div className="grid grid-cols-[3.25rem_1fr]">
        <div className="space-y-2 border-r border-line bg-surface p-3" aria-hidden>
          <LogoMark className="size-6" />
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={cx("block h-6 rounded-lg", i === 0 ? "bg-brand-50 ring-1 ring-brand-100" : "bg-sunken")} />
          ))}
        </div>
        <div className="space-y-3 p-4 pl-[38%]">
          <div className="grid grid-cols-2 gap-2">
            <MiniStat label="Reports received" value={received} highlight={phase === "synced"} />
            <MiniStat label="Awaiting review" value={14 + (phase === "synced" ? 1 : 0)} highlight={phase === "synced"} />
          </div>
          <div className="rounded-xl bg-sunken p-3">
            <p className="text-[0.625rem] font-semibold text-muted">Reports per day</p>
            <div className="mt-2 flex h-16 items-end gap-1.5" aria-hidden>
              {BARS.map((h, i) => (
                <motion.span
                  key={i}
                  className="flex-1 rounded-t-[4px] bg-[#0b8f72]"
                  initial={{ height: 0 }}
                  animate={{ height: `${i === BARS.length - 1 && phase === "synced" ? h + 14 : h}%` }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: i === BARS.length - 1 ? 0 : 0.5 + i * 0.05 }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[0.625rem] font-semibold text-muted">Recent submissions</p>
            <div className="grid grid-cols-2 gap-1.5">
              <AnimatePresence initial={false}>
                {delivered.slice(0, 4).map((r, i) => (
                  <motion.div
                    key={r.condition}
                    layout
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1, backgroundColor: i === 0 && phase === "synced" ? "rgb(221 245 234)" : "rgb(239 244 241)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE_OUT }}
                    className="rounded-lg p-2"
                  >
                    <p className="truncate text-[0.625rem] font-semibold text-ink">{r.condition}</p>
                    <div className="mt-1 flex items-center justify-between gap-1">
                      <span className="text-[0.5rem] text-muted">{r.meta.split(",")[0]}</span>
                      <span className={cx("rounded-full px-1 py-0.5 text-[0.4375rem] font-semibold", (r.severity as string) === "HIGH" || (r.severity as string) === "CRITICAL" ? "bg-failed-bg text-failed" : (r.severity as string) === "MODERATE" ? "bg-amber-soft text-amber-ink" : "bg-synced-bg text-synced")}>
                        {r.severity === "HIGH" ? "High" : r.severity === "MODERATE" ? "Moderate" : "Low"}
                      </span>
                    </div>
                    <span className={cx("mt-1 inline-block rounded-full px-1 py-0.5 text-[0.4375rem] font-semibold", r.status === "Reviewed" ? "bg-syncing-bg text-syncing" : "bg-sunken text-muted")}>
                      {r.status}
                    </span>
                  </motion.div>
                ))}
              </AnimatePresence>
              {delivered.length === 0 && <div className="col-span-2 rounded-lg bg-sunken px-2.5 py-1.5 text-[0.6875rem] text-muted">Waiting for reports…</div>}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: number; highlight: boolean }) {
  return (
    <div className={cx("rounded-xl p-2.5 ring-1 ring-inset transition-colors duration-500", highlight ? "bg-brand-50 ring-brand-100" : "bg-surface ring-line")}>
      <p className="text-[0.5625rem] font-medium text-muted">{label}</p>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={value}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
          className="text-lg font-semibold tabular-nums tracking-tight text-ink"
        >
          {value}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
