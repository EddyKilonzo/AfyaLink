"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps, Cell } from "recharts";
import { CHART_GRID, CHART_INK, CHART_MARK, CHART_MUTED } from "./colors";

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

/** Hook for staggered bar entrance animation using CSS-based approach */
function useStaggeredAnimation(itemCount: number, delay: number = 80): number[] {
  const [visibleIndices, setVisibleIndices] = useState<number[]>([]);
  const animationRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const initializedRef = useRef(false);

  useEffect(() => {
    // Clear any existing timeouts
    animationRef.current.forEach(clearTimeout);
    animationRef.current = [];

    // Only set initial state on first run
    if (!initializedRef.current) {
      initializedRef.current = true;
      setVisibleIndices([]);
    } else {
      setVisibleIndices([]);
    }

    for (let i = 0; i < itemCount; i++) {
      const timeout = setTimeout(() => {
        setVisibleIndices(prev => [...prev, i]);
      }, i * delay);
      animationRef.current.push(timeout);
    }

    return () => {
      animationRef.current.forEach(clearTimeout);
    };
  }, [itemCount, delay]);

  return visibleIndices;
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
  const visibleIndices = useStaggeredAnimation(data.length, compact ? 60 : 80);
  
  return (
    <div role="img" aria-label={`Reports per day over the last ${days} days`} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -18 }} barCategoryGap={compact ? "28%" : 2}>
          <CartesianGrid vertical={false} stroke={CHART_GRID} />
          <XAxis dataKey="day" tickFormatter={format} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_GRID }} minTickGap={compact ? 4 : 24} />
          <YAxis allowDecimals={false} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ fill: "rgb(20 108 90 / 0.06)", radius: 6 }} content={<ChartTooltip unit="report" labelFormat={shortDate} />} />
          <Bar
            dataKey="count"
            fill={CHART_MARK}
            radius={[5, 5, 0, 0]}
            maxBarSize={compact ? 28 : 18}
            isAnimationActive={animate}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={visibleIndices.includes(index) ? CHART_MARK : "transparent"}
                className={visibleIndices.includes(index) ? "animate-bar-grow" : ""}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <style jsx>{`
        .animate-bar-grow {
          animation: barGrow 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes barGrow {
          from {
            transform: scaleY(0);
            transform-origin: bottom;
          }
          to {
            transform: scaleY(1);
            transform-origin: bottom;
          }
        }
      `}</style>
    </div>
  );
}

export interface RankedDatum {
  label: string;
  value: number;
}

/** Horizontal bars, largest first, value at each bar's tip. For up to ~8 rows. */
export function RankedBarChart({ data, valueName, ariaLabel }: { data: RankedDatum[]; valueName: string; ariaLabel: string }) {
  const rows = useMemo(() => [...data].sort((a, b) => b.value - a.value).slice(0, 8), [data]);
  const animate = useAnimateOnce();
  const visibleIndices = useStaggeredAnimation(rows.length, 70);
  const height = rows.length * 34 + 12;
  
  return (
    <div role="img" aria-label={ariaLabel} className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 2, right: 40, bottom: 2, left: 0 }} barCategoryGap={9}>
          <XAxis type="number" hide allowDecimals={false} />
          <YAxis type="category" dataKey="label" tick={{ ...AXIS_TICK, fill: CHART_INK }} tickLine={false} axisLine={false} width={124} />
          <Tooltip cursor={{ fill: "rgb(20 108 90 / 0.06)", radius: 6 }} content={<ChartTooltip unit={valueName.toLowerCase().replace(/s$/, "")} />} />
          <Bar dataKey="value" fill={CHART_MARK} radius={[0, 5, 5, 0]} maxBarSize={16} isAnimationActive={animate} animationDuration={700}>
            {rows.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={visibleIndices.includes(index) ? CHART_MARK : "transparent"}
                className={visibleIndices.includes(index) ? "animate-bar-grow-horizontal" : ""}
              />
            ))}
            <LabelList dataKey="value" position="right" fill={CHART_INK} fontSize={12} fontWeight={600} dx={8} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <style jsx>{`
        .animate-bar-grow-horizontal {
          animation: barGrowHorizontal 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
        @keyframes barGrowHorizontal {
          from {
            transform: scaleX(0);
            transform-origin: left;
          }
          to {
            transform: scaleX(1);
            transform-origin: left;
          }
        }
      `}</style>
    </div>
  );
}
