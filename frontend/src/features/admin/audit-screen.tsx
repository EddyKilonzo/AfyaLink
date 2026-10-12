"use client";

import {
  ClipboardCheck,
  Download,
  KeyRound,
  LogIn,
  LogOut,
  MapPinPlus,
  PencilLine,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserCog,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { AsyncBoundary } from "@/components/async-boundary";
import { Stagger, StaggerItem } from "@/components/motion";
import { Pagination } from "@/components/pagination";
import { Button, FilterSelect, PageHeader, Panel } from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { formatDate } from "@/lib/format";
import { AUDIT_ACTIONS, type AuditAction, type AuditLog } from "@/types";
import { useAuditLogs } from "./hooks";

const ACTIONS: Record<AuditAction, { label: string; Icon: LucideIcon; tone?: "warn" }> = {
  "auth.login": { label: "Signed in", Icon: LogIn },
  "auth.login_failed": { label: "Failed sign-in", Icon: ShieldAlert, tone: "warn" },
  "auth.logout_all": { label: "Signed out everywhere", Icon: LogOut },
  "auth.password_change": { label: "Changed own password", Icon: KeyRound },
  "auth.mfa_enable": { label: "Turned on two-factor", Icon: ShieldCheck },
  "auth.mfa_disable": { label: "Turned off two-factor", Icon: ShieldOff, tone: "warn" },
  "user.create": { label: "Created a user", Icon: UserPlus },
  "user.update": { label: "Updated a user", Icon: UserCog },
  "user.password_reset": { label: "Reset a password", Icon: KeyRound, tone: "warn" },
  "user.mfa_reset": { label: "Reset two-factor", Icon: ShieldOff, tone: "warn" },
  "location.create": { label: "Added a location", Icon: MapPinPlus },
  "report.update": { label: "Corrected a report", Icon: PencilLine },
  "report.review": { label: "Reviewed a report", Icon: ClipboardCheck },
  "report.export": { label: "Exported reports", Icon: Download },
};

const shortId = (id: string | null) => (id ? `${id.slice(0, 8)}…` : "system");
const time = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export function AuditScreen() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const logs = useAuditLogs({ page, limit: 30, action: action || undefined, from: from || undefined, to: to || undefined });

  return (
    <>
      <PageHeader
        title="Audit log"
        description="A permanent record of sign-ins, account changes, reviews and exports. Entries can't be edited or deleted."
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <FilterSelect
              label="Action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value as AuditAction | "");
                setPage(1);
              }}
            >
              <option value="">All actions</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {ACTIONS[a].label}
                </option>
              ))}
            </FilterSelect>
            <div className="flex items-end gap-2">
              <label className="grid gap-1">
                <span className="text-label">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value);
                    setPage(1);
                  }}
                  className="min-h-10 rounded-[10px] border border-line-strong bg-surface px-3 text-sm shadow-xs focus:border-brand-500 focus:shadow-[var(--shadow-glow)] focus:outline-none"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-label">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value);
                    setPage(1);
                  }}
                  className="min-h-10 rounded-[10px] border border-line-strong bg-surface px-3 text-sm shadow-xs focus:border-brand-500 focus:shadow-[var(--shadow-glow)] focus:outline-none"
                />
              </label>
            </div>
          </div>
        }
      />

      <Panel className="p-3 sm:p-5">
        <AsyncBoundary state={logs} isEmpty={(d) => d.items.length === 0} empty={{ icon: ScrollText, title: "No entries", description: action ? "Nothing recorded for this action yet." : undefined }}>
          {(d) => (
            <>
              <Timeline items={d.items} />
              <Pagination page={d} onPageChange={setPage} />
            </>
          )}
        </AsyncBoundary>
      </Panel>
    </>
  );
}

function Timeline({ items }: { items: AuditLog[] }) {
  const days = useMemo(() => {
    const map = new Map<string, AuditLog[]>();
    for (const item of items) {
      const key = item.createdAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <div className="space-y-6">
      {days.map(([day, entries]) => (
        <section key={day} aria-label={formatDate(day)}>
          <h2 className="mb-2 px-2 text-xs font-semibold text-muted">{formatDate(`${day}T12:00:00Z`)}</h2>
          <Stagger className="relative space-y-1 before:absolute before:bottom-4 before:left-[1.625rem] before:top-4 before:w-px before:bg-line">
            {entries.map((entry) => {
              const meta = ACTIONS[entry.action] ?? { label: entry.action, Icon: ScrollText };
              return (
                <StaggerItem key={entry.id} className="relative flex gap-3 rounded-xl px-2 py-2.5 hover:bg-sunken/70">
                  <span
                    className={cx(
                      "relative grid size-9 shrink-0 place-items-center rounded-full ring-4 ring-surface",
                      meta.tone === "warn" ? "bg-amber-soft text-amber-ink" : "bg-brand-50 text-brand-600",
                    )}
                  >
                    <meta.Icon className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="font-semibold text-ink">{meta.label}</span>
                      <time dateTime={entry.createdAt} className="text-xs tabular-nums text-muted">
                        {time(entry.createdAt)}
                      </time>
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      By {shortId(entry.actorId)}
                      {entry.targetId && `, on ${entry.targetType ?? "item"} ${shortId(entry.targetId)}`}
                      {entry.ipAddress && `, from ${entry.ipAddress}`}
                    </p>
                    {entry.details && Object.keys(entry.details).length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {Object.entries(entry.details)
                          .filter(([, v]) => v !== null && v !== "")
                          .map(([k, v]) => (
                            <span key={k} className="rounded-md bg-sunken px-1.5 py-0.5 text-[0.6875rem] text-muted ring-1 ring-inset ring-line">
                              {k}: <span className="font-medium text-ink">{String(v)}</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>
      ))}
    </div>
  );
}
