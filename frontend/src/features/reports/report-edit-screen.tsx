"use client";

import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AsyncBoundary } from "@/components/async-boundary";
import { EmptyState, PageHeader, Panel } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-context";
import { isUuid } from "@/lib/security";
import { canCorrectReport, useReport } from "./hooks";
import { ReportForm } from "./report-form";

export function ReportEditScreen() {
  const params = useParams<{ id: string }>();
  const id = isUuid(params.id) ? params.id : undefined;
  const report = useReport(id);
  const { user } = useAuth();

  return (
    <>
      <Link href={id ? `/reports/${id}` : "/reports"} className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Back to report
      </Link>
      <PageHeader title="Correct report" description="You can correct your own report while it's still Submitted, within 72 hours of the server receiving it." />
      {!id ? (
        <Panel className="p-6 text-sm text-error">This report link isn&apos;t valid.</Panel>
      ) : (
        <AsyncBoundary state={report}>
          {(r) =>
            canCorrectReport(r, user) ? (
              <ReportForm report={r} />
            ) : (
              <Panel>
                <EmptyState
                  icon={Lock}
                  title="This report can't be changed now"
                  description="It has been reviewed, or more than 72 hours have passed since the server received it. Ask your supervisor if something needs fixing."
                />
              </Panel>
            )
          }
        </AsyncBoundary>
      )}
    </>
  );
}
