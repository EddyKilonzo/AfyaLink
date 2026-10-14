"use client";

import { Activity, ArrowRight, CircleAlert, Clock, FilePlus2, FileText, MapPinned, RefreshCw } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { cx } from "@/components/ui/cx";
import { EASE_OUT, Stagger, StaggerItem } from "@/components/motion";
import { PullToRefresh } from "@/components/pull-to-refresh";
import { DrawnBorder } from "@/components/brand/drawn-border";
import { HexTexture } from "@/components/brand/hex-texture";
import { useSyncSummary } from "@/components/shell/sync-status";
import { Button, ButtonLink, EmptyState, ErrorState, LoadingState, Panel, PanelHeader, Skeleton, StatCard } from "@/components/ui";
import { Segmented } from "@/components/ui/segmented";
import { DailyReportsChart } from "@/features/analytics/charts";
import { useAnalyticsSummary, useMapPoints } from "@/features/analytics/hooks";
import { HeatmapMap, HeatLegend } from "@/features/analytics/heatmap-layer";
import { useAuth } from "@/features/auth/auth-context";
import { useReportsFeed } from "@/features/reports/hooks";
import { ReportRow } from "@/features/reports/report-row";
import { useSync } from "@/features/sync/sync-context";
import { formatRelative, greeting, plural } from "@/lib/format";

const PERIODS = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

export function DashboardScreen() {
  const { user } = useAuth();
  const { counts, syncNow } = useSync();
  const [days, setDays] = useState(7);
  const summary = useAnalyticsSummary(days);
  const firstName = user?.fullName.split(" ")[0] ?? "";
  const waiting = counts.pending + counts.syncing;

  async function refresh() {
    await Promise.all([summary.reload(), syncNow()]);
  }

  return (
    <PullToRefresh onRefresh={refresh}>
      <div className="space-y-6 sm:space-y-8">
      <header>
        <p className="text-sm text-muted">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 className="mt-1 text-h1">
          {greeting()}, {firstName}
        </h1>
      </header>

      <TodayPanel />

      <section aria-labelledby="numbers-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="numbers-heading" className="text-h3">
            Your reporting
          </h2>
          <Segmented label="Period" size="sm" value={days} onChange={setDays} options={PERIODS} />
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Reports received" value={summary.data?.totals.reports ?? null} icon={FileText} hint={`Last ${days} days, on the server`} />
          <StatCard label="Cases recorded" value={summary.data?.totals.cases ?? null} icon={Activity} hint={`Last ${days} days`} />
          <StatCard label="Waiting to sync" value={waiting} icon={Clock} tone={waiting ? "amber" : "default"} hint="On this device" />
          <StatCard
            label="Not sent"
            value={counts.failed}
            icon={CircleAlert}
            tone={counts.failed ? "error" : "default"}
            hint={counts.failed ? "Open Sync to fix" : "Nothing to fix"}
          />
        </div>
        {summary.error && !summary.data && <ErrorState className="mt-3" message={summary.error} onRetry={summary.reload} />}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel>
          <PanelHeader title="Reports per day" description={`Received by the server, last ${days} days`} />
          <div className="px-3 pb-4 pt-4 sm:px-5">
            {summary.data ? (
              <DailyReportsChart byDay={summary.data.byDay} since={summary.data.since} days={summary.data.periodDays} compact={days <= 7} height={208} />
            ) : (
              <Skeleton className="h-52 w-full rounded-xl" />
            )}
          </div>
        </Panel>
        <MiniMap />
      </div>

      <RecentReports />
      </div>
    </PullToRefresh>
  );
}

/** The one emphasised surface: what to do next, and the honest state of this device's queue. */
function TodayPanel() {
  const { online, isSyncing, counts, lastSyncAt, syncNow } = useSync();
  const s = useSyncSummary();
  const waiting = counts.pending + counts.failed;
  const message = !online
    ? waiting
      ? `${plural(waiting, "report")} saved on this device. They'll sync when you're back online.`
      : "You're offline. You can still record reports; they're saved on this device."
    : isSyncing
      ? "Sending your reports to the server now."
      : counts.failed
        ? `${plural(counts.failed, "report")} couldn't be sent. Review them on the Sync page.`
        : counts.pending
          ? `${plural(counts.pending, "report")} waiting to sync.`
          : "Everything you've recorded has reached the server.";

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
      aria-label="Today"
      className="relative overflow-hidden rounded-[var(--radius-2xl)] bg-brand-900 p-5 text-white shadow-[var(--shadow-lg)] sm:p-7"
    >
      <HexTexture tone="dark" glow={true} />
      <DrawnBorder radius={28} tone="dark" delay={300} />
      {/* Subtle gradient overlay for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-800/60 via-transparent to-brand-950/40"
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-md">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-brand-100 ring-1 ring-inset ring-white/15 backdrop-blur-sm">
            <s.Icon className={cx(s.spin ? "size-3.5 animate-spin" : "size-3.5")} aria-hidden />
            {s.label}
          </span>
          <p className="mt-3 text-lg font-medium leading-snug tracking-[-0.01em] text-white sm:text-xl">{message}</p>
          <p className="mt-1.5 text-sm text-brand-200">{lastSyncAt ? `Last synced ${formatRelative(lastSyncAt)}` : waiting || counts.syncing ? "Not synced from this device yet" : "Nothing waiting on this device"}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <ButtonLink href="/reports/new" variant="inverse" size="lg" icon={<FilePlus2 className="size-[18px]" aria-hidden />}>
            New health report
          </ButtonLink>
          {online && waiting > 0 && (
            <Button
              variant="ghost"
              size="lg"
              loading={isSyncing}
              onClick={() => void syncNow()}
              icon={<RefreshCw className="size-4" aria-hidden />}
              className="text-brand-100 hover:bg-white/10 hover:text-white"
            >
              Sync now
            </Button>
          )}
        </div>
      </div>
    </motion.section>
  );
}

function MiniMap() {
  const map = useMapPoints({ days: 30 });
  return (
    <Panel className="flex flex-col overflow-hidden">
      <PanelHeader
        title="Your area"
        description="Report locations, last 30 days"
        action={
          <Link href="/maps" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            Open map <ArrowRight className="size-3.5 transition-transform duration-[var(--duration-micro)] group-hover:translate-x-0.5" aria-hidden />
          </Link>
        }
      />
      <div className="relative mt-4 h-56 flex-1 border-t border-line lg:h-auto lg:min-h-56">
        {map.data && map.data.points.length === 0 ? (
          <EmptyState
            icon={MapPinned}
            title="No locations yet"
            description="Add your GPS position when you record a report to see it here."
            className="h-full justify-center py-6"
          />
        ) : map.error && !map.data ? (
          <div className="p-4">
            <ErrorState message={map.error} onRetry={map.reload} />
          </div>
        ) : map.data ? (
          <div className="absolute inset-0">
            <HeatmapMap
              points={map.data.points.map(p => ({ lat: p.latitude, lng: p.longitude, weight: p.casesCount }))}
              heatmapProps={{ radius: 28, maxOpacity: 0.85 }}
              className="h-full w-full"
            />
            <HeatLegend minLabel="Fewer" maxLabel="More cases" className="absolute bottom-3 left-3 right-3 bg-white/90 backdrop-blur-sm rounded-xl p-2 ring-1 ring-inset ring-black/5" />
          </div>
        ) : (
          <Skeleton className="absolute inset-0 rounded-none" />
        )}
      </div>
    </Panel>
  );
}

function RecentReports() {
  const feed = useReportsFeed({ page: 1, limit: 5 });
  return (
    <Panel>
      <PanelHeader
        title="Recent reports"
        description="Reports still on this device are listed first"
        action={
          <Link href="/reports" className="group inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
            View all <ArrowRight className="size-3.5 transition-transform duration-[var(--duration-micro)] group-hover:translate-x-0.5" aria-hidden />
          </Link>
        }
      />
      <div className="p-2 pt-3 sm:p-3">
        {feed.error && feed.items.length === 0 ? (
          <div className="p-2">
            <ErrorState message={feed.error} onRetry={feed.reload} />
          </div>
        ) : feed.loading && feed.items.length === 0 ? (
          <div className="p-3">
            <LoadingState rows={3} label="Loading recent reports" />
          </div>
        ) : feed.items.length === 0 ? (
          <EmptyState
            icon={FilePlus2}
            title="No reports yet"
            description="Your first report takes about a minute. It's saved on this device even without a connection."
            action={<ButtonLink href="/reports/new">Record a report</ButtonLink>}
          />
        ) : (
          <Stagger className="space-y-0.5">
            {feed.items.slice(0, 6).map((item) => (
              <StaggerItem key={item.id}>
                <ReportRow report={item.report} source={item.source} href={item.source === "server" ? `/reports/${item.id}` : "/sync"} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </div>
    </Panel>
  );
}
