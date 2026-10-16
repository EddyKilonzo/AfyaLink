"use client";

import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { cx } from "@/components/ui/cx";
import { fillDays } from "./charts";
import { CHART_MARK } from "./colors";

/**
 * A tiny reports-per-day line for a stat card. Decorative: the card's number
 * and the full daily chart carry the values, so it is hidden from assistive tech.
 */
export function Sparkline({ byDay, since, days, className }: { byDay: { day: string; count: number }[]; since: string; days: number; className?: string }) {
  const gradientId = useId();
  const path = useMemo(() => {
    const data = fillDays(byDay, since, days);
    if (data.length < 2) return null;
    const max = Math.max(1, ...data.map((d) => d.count));
    const w = 100;
    const h = 28;
    const pad = 2;
    const points = data.map((d, i) => [(i / (data.length - 1)) * w, h - pad - (d.count / max) * (h - pad * 2)] as const);
    const line = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
    return { line, area: `${line} L${w},${h} L0,${h} Z`, last: points[points.length - 1] };
  }, [byDay, since, days]);
  if (!path) return null;
  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className={cx("h-7 w-full overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_MARK} stopOpacity="0.22" />
          <stop offset="100%" stopColor={CHART_MARK} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${gradientId})`} />
      <path d={path.line} fill="none" stroke={CHART_MARK} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * Change against the previous period of the same length. Deliberately neutral
 * ink: more reports is not "good" or "bad" by itself, so direction is carried
 * by the arrow and the words, never by a red/green judgement.
 */
export function TrendBadge({ current, previous, days }: { current: number; previous: number | undefined; days: number }) {
  if (previous === undefined) return null;
  const diff = current - previous;
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  let text: string;
  if (diff === 0) text = "Same as";
  else if (previous === 0) text = `+${diff.toLocaleString()} vs`;
  else text = `${diff > 0 ? "+" : "−"}${Math.round((Math.abs(diff) / previous) * 100)}% vs`;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted">
      <span className="inline-flex items-center gap-0.5 rounded-full bg-sunken px-1.5 py-0.5 font-semibold tabular-nums text-ink">
        <Icon className="size-3" aria-hidden />
        {text.replace(/ vs$| as$/, "")}
      </span>
      {text.endsWith("as") ? "as" : "vs"} previous {days} days
    </span>
  );
}

export interface ProportionSegment {
  key: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Share of a whole, as one bar split into ordered segments with 2px surface
 * gaps, plus a legend that doubles as the table view (label, count, share).
 * Each segment is focusable and shows its value on hover or focus.
 */
export function ProportionBar({ segments, unit, ariaLabel }: { segments: ProportionSegment[]; unit: string; ariaLabel: string }) {
  const [active, setActive] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const plural = (n: number) => `${n.toLocaleString()} ${n === 1 ? unit : `${unit}s`}`;
  const share = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  if (total === 0) {
    return <p className="py-6 text-center text-sm text-muted">No {unit}s in this period.</p>;
  }

  const shown = segments.filter((s) => s.value > 0);
  const focused = shown.find((s) => s.key === active);

  return (
    <figure aria-label={ariaLabel} className="space-y-4">
      <div className="relative">
        <div className="flex h-3.5 w-full gap-0.5" onMouseLeave={() => setActive(null)}>
          {shown.map((s) => (
            <button
              key={s.key}
              type="button"
              className={cx(
                "h-full min-w-1.5 cursor-default rounded-[4px] transition-[opacity,transform] duration-[var(--duration-micro)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/35",
                active && active !== s.key && "opacity-45",
              )}
              style={{ flexGrow: s.value, flexBasis: 0, background: s.color }}
              onMouseEnter={() => setActive(s.key)}
              onFocus={() => setActive(s.key)}
              onBlur={() => setActive(null)}
              aria-label={`${s.label}: ${plural(s.value)}, ${share(s.value)}%`}
            />
          ))}
        </div>
        {focused && (
          <div
            role="status"
            className="pointer-events-none absolute -top-11 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line bg-surface px-3 py-1.5 text-[0.8125rem] shadow-[var(--shadow-ring),var(--shadow-md)]"
          >
            <span className="text-muted">{focused.label}</span>{" "}
            <span className="font-semibold tabular-nums text-ink">
              {plural(focused.value)} · {share(focused.value)}%
            </span>
          </div>
        )}
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">
        {segments.map((s) => (
          <div key={s.key} className={cx("min-w-0 transition-opacity", active && active !== s.key && "opacity-50")}>
            <dt className="flex items-center gap-1.5 text-xs text-muted">
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden />
              <span className="truncate">{s.label}</span>
            </dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5">
              <span className="text-lg font-semibold tabular-nums text-ink">{s.value.toLocaleString()}</span>
              <span className="text-xs tabular-nums text-muted">{share(s.value)}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
