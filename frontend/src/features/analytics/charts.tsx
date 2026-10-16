"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import { CHART_CURSOR, CHART_GRID, CHART_MARK, CHART_MUTED } from "./colors";

/**
 * Single-series charts. No legend box: the panel title names the measure.
 * Exact values are always available as text next to each chart (table view).
 */

const AXIS_TICK = { fill: CHART_MUTED, fontSize: 12 };

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Pads the server's sparse `byDay` with zero days so gaps are visible, not hidden. */
export function fillDays(byDay: { day: string; count: number }[], since: string, days: number): { day: string; count: number }[] {
  const counts = new Map(byDay.map((d) => [d.day, d.count]));
  const start = new Date(since);
  start.setUTCHours(0, 0, 0, 0);
  const out: { day: string; count: number }[] = [];
  for (let i = 0; i <= days; i++) {
    const date = new Date(start.getTime() + i * 86_400_000);
    if (date.getTime() > Date.now()) break;
    const key = dayKey(date);
    out.push({ day: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

const shortDate = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { day: "numeric", month: "short", timeZone: "UTC" });
const weekday = (day: string) => new Date(`${day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" });

/** Recharts animates on every data change; play the entrance once, then update instantly. */
function useAnimateOnce(): boolean {
  const [animate, setAnimate] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(false), 900);
    return () => clearTimeout(timer);
  }, []);
  return animate;
}

function ChartTooltip({ active, payload, label, unit, labelFormat }: Partial<TooltipContentProps<number, string>> & { unit: string; labelFormat?: (l: string) => string }) {
  if (!active || !payload?.length) return null;
  const value = Number(payload[0]?.value ?? 0);
  return (
    <div className="rounded-xl bg-surface px-3 py-2 text-[0.8125rem] shadow-[var(--shadow-ring),var(--shadow-md)] border border-line">
      <p className="text-muted">{labelFormat ? labelFormat(String(label)) : String(label)}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-ink">
        {value.toLocaleString()} {value === 1 ? unit : `${unit}s`}
      </p>
    </div>
  );
}

export function DailyReportsChart({
  byDay,
  since,
  days,
  height = 224,
  compact = false,
}: {
  byDay: { day: string; count: number }[];
  since: string;
  days: number;
  height?: number;
  /** Weekday labels for a 7-day view. */
  compact?: boolean;
}) {
  const data = useMemo(() => fillDays(byDay, since, days), [byDay, since, days]);
  const animate = useAnimateOnce();
  const format = compact ? weekday : shortDate;
  
  return (
    <div role="img" aria-label={`Reports per day over the last ${days} days`} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap={compact ? "28%" : 2}>
          <CartesianGrid vertical={false} stroke={CHART_GRID} />
          <XAxis dataKey="day" tickFormatter={format} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={compact ? 4 : 24} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ fill: CHART_CURSOR, radius: 6 }} content={<ChartTooltip unit="report" labelFormat={shortDate} />} />
          <Bar
            dataKey="count"
            fill={CHART_MARK}
            radius={[5, 5, 0, 0]}
            maxBarSize={compact ? 28 : 18}
            isAnimationActive={animate}
            animationDuration={700}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface RankedDatum {
  label: string;
  value: number;
}

/**
 * Horizontal bars, largest first, value printed at each bar's end. Plain HTML
 * rather than Recharts: values always render, long labels wrap instead of
 * clipping, and the colours come straight from the theme tokens. Up to 8 rows.
 */
export function RankedBarChart({ data, valueName, ariaLabel }: { data: RankedDatum[]; valueName: string; ariaLabel: string }) {
  const rows = useMemo(() => [...data].sort((a, b) => b.value - a.value).slice(0, 8), [data]);
  const max = Math.max(1, ...rows.map((r) => r.value));
  // Grow from zero once mounted; the transition is disabled under reduced motion by globals.css.
  const [grown, setGrown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGrown(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const unit = valueName.toLowerCase();

  return (
    <ul aria-label={ariaLabel} className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,10rem)_1fr]">
          <span className="text-[0.8125rem] leading-tight text-ink [overflow-wrap:anywhere]">{r.label}</span>
          <span className="flex items-center gap-2" title={`${r.label}: ${r.value.toLocaleString()} ${unit}`}>
            <span className="h-3.5 min-w-0 flex-1">
              <span
                className="block h-full rounded-r-[5px] rounded-l-[2px] transition-[width] duration-700 ease-[var(--ease-out)]"
                style={{ width: grown ? `${Math.max(2, (r.value / max) * 100)}%` : "0%", background: CHART_MARK }}
              />
            </span>
            <span className="w-8 shrink-0 text-right text-xs font-semibold tabular-nums text-ink">
              {r.value.toLocaleString()}
              <span className="sr-only"> {unit}</span>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
