"use client";

import { ArrowLeft, CheckCheck, Eye, MapPin, PencilLine } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AsyncBoundary } from "@/components/async-boundary";
import { RoleGate } from "@/components/require-auth";
import { Badge, Button, ButtonLink, DataList, Panel, PanelHeader, ReviewStatusBadge, SeverityBadge, ServerErrors, Skeleton, Textarea } from "@/components/ui";
import { useConfirm } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { useLocations } from "@/features/locations/hooks";
import { openPrintablePdf, type PdfSection } from "@/lib/pdf-generator";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { isUuid } from "@/lib/security";
import { formatLocation } from "@/services/locations.service";
import { AGE_GROUP_LABELS, CATEGORY_LABELS, NEXT_STATUSES, SEVERITY_LABELS, STATUS_LABELS, type ReviewStatus, type ServerReport } from "@/types";
import { canCorrectReport, useReport, useReviewReport } from "./hooks";
import { CategoryIcon } from "./report-row";

export function ReportDetailScreen() {
  const params = useParams<{ id: string }>();
  const id = isUuid(params.id) ? params.id : undefined;
  const report = useReport(id);
  const { user, hasRole } = useAuth();
  const { byId } = useLocations();

  return (
    <>
      <Link
        href={hasRole("ADMIN") ? "/admin/reports" : "/reports"}
        className="mb-5 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> {hasRole("ADMIN") ? "Review queue" : "My reports"}
      </Link>
      {!id ? (
        <Panel className="p-6 text-sm text-error">This report link isn&apos;t valid.</Panel>
      ) : (
        <AsyncBoundary
          state={report}
          loading={
            <div className="space-y-4">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-72 w-full rounded-[var(--radius-xl)]" />
            </div>
          }
        >
          {(r) => {
            const location = r.locationId ? byId.get(r.locationId) : undefined;
            return (
              <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
                <div className="min-w-0 space-y-6">
                  <header className="flex items-start gap-4">
                    <CategoryIcon category={r.category} className="size-12 rounded-2xl" />
                    <div className="min-w-0">
                      <h1 className="text-h1 break-words">{r.conditionName}</h1>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <ReviewStatusBadge status={r.status} />
                        <SeverityBadge severity={r.severity} />
                        <span className="text-sm text-muted">Observed {formatRelative(r.observedAt)}</span>
                      </div>
                    </div>
                  </header>

                  <Panel>
                    <PanelHeader title="Report" />
                    <div className="px-5 pb-2 sm:px-6">
                      <DataList
                        rows={[
                          ["Category", CATEGORY_LABELS[r.category]],
                          ["Cases", r.casesCount.toLocaleString()],
                          ["Age group", AGE_GROUP_LABELS[r.ageGroup]],
                          [
                            "Symptoms",
                            r.symptoms?.length ? (
                              <span className="flex flex-wrap gap-1.5">
                                {r.symptoms.map((s) => (
                                  <Badge key={s}>{s}</Badge>
                                ))}
                              </span>
                            ) : null,
                          ],
                          ["Notes", r.notes ? <span className="whitespace-pre-wrap font-normal leading-relaxed">{r.notes}</span> : null],
                          ["Observed", formatDateTime(r.observedAt)],
                          ["Received", formatDateTime(r.receivedAt)],
                        ]}
                      />
                    </div>
                  </Panel>
                </div>

                <aside className="space-y-4">
                  <Panel variant="sunken" className="p-5">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <MapPin className="size-4 text-brand-600" aria-hidden /> Location
                    </h2>
                    <p className="mt-2 text-sm text-ink">{location ? formatLocation(location) : r.locationId ? `Area #${r.locationId}` : "No area recorded"}</p>
                    {r.latitude && r.longitude && (
                      <p className="mt-1 text-[0.8125rem] tabular-nums text-muted">
                        GPS {Number(r.latitude).toFixed(5)}, {Number(r.longitude).toFixed(5)}
                      </p>
                    )}
                  </Panel>

                  <Panel variant="sunken" className="p-5">
                    <h2 className="text-sm font-semibold text-ink">Review</h2>
                    {r.reviewedAt ? (
                      <>
                        <p className="mt-2 text-sm text-ink">
                          {STATUS_LABELS[r.status]} {formatRelative(r.reviewedAt)}
                        </p>
                        {r.reviewNote && <p className="mt-2 rounded-xl bg-surface p-3 text-sm leading-relaxed text-ink shadow-xs">{r.reviewNote}</p>}
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-muted">Not reviewed yet.</p>
                    )}
                  </Panel>

                  {canCorrectReport(r, user) && (
                    <ButtonLink href={`/reports/${r.id}/edit`} variant="outline" className="w-full" icon={<PencilLine className="size-4" aria-hidden />}>
                      Correct this report
                    </ButtonLink>
                  )}

                  <ReportPdfButton report={r} />

                  <RoleGate roles={["ADMIN"]}>
                    <ReviewActions report={r} onDone={report.reload} />
                  </RoleGate>
                </aside>
              </div>
            );
          }}
        </AsyncBoundary>
      )}
    </>
  );
}

function ReportPdfButton({ report }: { report: ServerReport }) {
  const { user } = useAuth();
  const { byId } = useLocations();
  const toast = useToast();
  const location = report.locationId ? byId.get(report.locationId) : undefined;

  function exportPdf() {
    const gps = report.latitude && report.longitude ? `${Number(report.latitude).toFixed(5)}, ${Number(report.longitude).toFixed(5)}` : "Not recorded";
    const sections: PdfSection[] = [
      {
        heading: "At a glance",
        stats: [
          { label: "Cases", value: report.casesCount.toLocaleString(), hint: AGE_GROUP_LABELS[report.ageGroup] },
          { label: "Severity", value: SEVERITY_LABELS[report.severity] },
          { label: "Review status", value: STATUS_LABELS[report.status], hint: report.reviewedAt ? `Updated ${formatDate(report.reviewedAt)}` : "Not reviewed yet" },
          { label: "Observed", value: formatDate(report.observedAt), hint: new Date(report.observedAt).toLocaleTimeString(undefined, { timeStyle: "short" }) },
        ],
      },
      {
        heading: "Report details",
        rows: [
          { label: "Condition", value: report.conditionName },
          { label: "Category", value: CATEGORY_LABELS[report.category] },
          { label: "Age group", value: AGE_GROUP_LABELS[report.ageGroup] },
          { label: "Received by server", value: formatDateTime(report.receivedAt) },
          { label: "Symptoms", value: report.symptoms?.length ? report.symptoms.join(", ") : "None recorded" },
          { label: "Report ID", value: report.id },
          ...(report.notes ? [{ label: "Notes", value: report.notes }] : []),
        ],
      },
      {
        heading: "Location",
        rows: [
          { label: "Area", value: location ? formatLocation(location) : report.locationId ? `Area #${report.locationId}` : "No area recorded" },
          { label: "GPS position", value: gps },
        ],
      },
      ...(report.reviewNote
        ? [{ heading: "Review", description: "Notes from the reviewing administrator", rows: [{ label: "Reviewer note", value: report.reviewNote }] }]
        : []),
    ];
    try {
      openPrintablePdf(
        {
          title: report.conditionName,
          subtitle: `${CATEGORY_LABELS[report.category]} · ${SEVERITY_LABELS[report.severity]} severity · ${report.casesCount.toLocaleString()} case(s)`,
          kind: "Health report",
          generatedAt: formatDateTime(new Date().toISOString()),
          generatedBy: user?.fullName || "AfyaLink user",
          role: user?.role === "ADMIN" ? "Administrator" : "Community Health Volunteer",
        },
        sections,
        `report-${report.id.slice(0, 8)}.pdf`,
      );
    } catch (error) {
      toast.error("PDF failed", error instanceof Error ? error.message : "Could not open the PDF window.");
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={exportPdf} icon={<Eye className="size-4" aria-hidden />}>
      Download as PDF
    </Button>
  );
}

export function ReviewActions({ report, onDone, compact = false }: { report: ServerReport; onDone: () => void; compact?: boolean }) {
  const review = useReviewReport();
  const confirm = useConfirm();
  const toast = useToast();
  const [note, setNote] = useState("");
  const options = NEXT_STATUSES[report.status];
  if (options.length === 0) return null;

  async function act(status: ReviewStatus) {
    const ok = await confirm({
      title: status === "ACTIONED" ? "Mark as actioned?" : "Mark as reviewed?",
      description:
        status === "ACTIONED"
          ? "This records that follow-up action was taken. It can't be moved back."
          : "This records that you've read and checked the report. It can't be moved back.",
      confirmLabel: status === "ACTIONED" ? "Mark actioned" : "Mark reviewed",
    });
    if (!ok) return;
    if (await review.run(report.id, { status, reviewNote: note.trim() || undefined })) {
      setNote("");
      toast.success(status === "ACTIONED" ? "Marked actioned" : "Marked reviewed", report.conditionName);
      onDone();
    }
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-[var(--radius-xl)] bg-surface p-5 shadow-[var(--shadow-ring),var(--shadow-xs)]"}>
      {!compact && <h2 className="text-sm font-semibold text-ink">Record your review</h2>}
      <label htmlFor={`note-${report.id}`} className="sr-only">
        Review note (optional)
      </label>
      <Textarea
        id={`note-${report.id}`}
        value={note}
        maxLength={500}
        rows={compact ? 1 : 2}
        placeholder="Add a note (optional)"
        onChange={(e) => setNote(e.target.value)}
        className="!mt-0 !min-h-11 text-sm"
      />
      <ServerErrors error={review.error} fieldErrors={review.fieldErrors} />
      <div className="flex flex-wrap gap-2">
        {options.map((s) => (
          <Button
            key={s}
            size={compact ? "sm" : "md"}
            variant={s === "ACTIONED" ? "primary" : "outline"}
            loading={review.pending}
            onClick={() => void act(s)}
            icon={s === "ACTIONED" ? <CheckCheck className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
            className={compact ? undefined : "flex-1"}
          >
            Mark {STATUS_LABELS[s].toLowerCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}
