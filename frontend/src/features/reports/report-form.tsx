"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, LocateFixed, MapPinOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Button, Card, cx, ErrorState } from "@/components/ui";
import { useAuth } from "@/features/auth/auth-context";
import { saveReportLocally } from "@/features/sync/sync-engine";
import { useSync } from "@/features/sync/sync-context";
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  CATEGORY_LABELS,
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  SEVERITY_LABELS,
} from "@/types";
import {
  CONDITION_SUGGESTIONS,
  parseSymptoms,
  reportFormSchema,
  type ReportFormInput,
  type ReportFormValues,
} from "./report-schema";

function localDateTimeNow(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

const inputClass =
  "mt-1 block w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted/70 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 aria-[invalid=true]:border-failed";

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1 text-sm text-failed">
      {message}
    </p>
  );
}

export function ReportForm() {
  const { user } = useAuth();
  const { online, syncNow } = useSync();
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ online: boolean } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormInput, unknown, ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: {
      category: "DISEASE_CASE",
      severity: "LOW",
      ageGroup: "MIXED",
      casesCount: 1,
      observedAt: localDateTimeNow(),
    },
  });

  const [latitude, longitude, severity] = useWatch({ control, name: ["latitude", "longitude", "severity"] });

  function captureLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("This device cannot share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", Number(pos.coords.latitude.toFixed(6)));
        setValue("longitude", Number(pos.coords.longitude.toFixed(6)));
        setLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. You can still save the report without it."
            : "Could not get your location. You can still save the report without it.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  function clearLocation() {
    setValue("latitude", undefined);
    setValue("longitude", undefined);
  }

  async function onSubmit(values: ReportFormValues) {
    if (!user) return;
    setSubmitError(null);
    try {
      await saveReportLocally(user.id, {
        id: crypto.randomUUID(),
        category: values.category,
        conditionName: values.conditionName,
        severity: values.severity,
        casesCount: values.casesCount,
        ageGroup: values.ageGroup,
        symptoms: parseSymptoms(values.symptoms),
        notes: values.notes?.trim() || undefined,
        latitude: values.latitude,
        longitude: values.longitude,
        observedAt: new Date(values.observedAt).toISOString(),
        clientCreatedAt: new Date().toISOString(),
      });
      setSaved({ online });
      reset({ ...values, conditionName: "", symptoms: "", notes: "", casesCount: 1, observedAt: localDateTimeNow() });
      // Saved locally first; upload is attempted in the background.
      if (online) void syncNow();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Could not save the report.");
    }
  }

  if (saved) {
    return (
      <Card className="flex flex-col items-start gap-3">
        <CheckCircle2 className="size-8 text-synced" aria-hidden />
        <h2 className="font-display text-xl font-semibold">Report saved on this device</h2>
        <p className="text-sm text-muted">
          {saved.online
            ? "It is being sent to the server now. Check the Sync page to confirm it was received."
            : "You are offline. It will be sent automatically when the connection returns."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setSaved(null)}>Record another</Button>
          <Button variant="secondary" onClick={() => router.push("/sync")}>
            View sync status
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      {submitError && <ErrorState message={submitError} />}

      <Card className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="category" className="text-sm font-semibold">
              Category
            </label>
            <select id="category" {...register("category")} className={inputClass} aria-invalid={!!errors.category}>
              {REPORT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <FieldError id="category-error" message={errors.category?.message} />
          </div>

          <div>
            <label htmlFor="conditionName" className="text-sm font-semibold">
              Condition or issue
            </label>
            <input
              id="conditionName"
              list="condition-suggestions"
              autoComplete="off"
              placeholder="e.g. Malaria"
              {...register("conditionName")}
              className={inputClass}
              aria-invalid={!!errors.conditionName}
              aria-describedby={errors.conditionName ? "conditionName-error" : undefined}
            />
            <datalist id="condition-suggestions">
              {CONDITION_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <FieldError id="conditionName-error" message={errors.conditionName?.message} />
          </div>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Severity</legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {REPORT_SEVERITIES.map((s) => (
              <label
                key={s}
                className={cx(
                  "flex min-h-11 cursor-pointer items-center justify-center rounded-lg border text-sm font-semibold transition-colors",
                  severity === s ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted hover:bg-brand-50",
                )}
              >
                <input type="radio" value={s} {...register("severity")} className="sr-only" />
                {SEVERITY_LABELS[s]}
              </label>
            ))}
          </div>
          <FieldError id="severity-error" message={errors.severity?.message} />
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label htmlFor="casesCount" className="text-sm font-semibold">
              Number of cases
            </label>
            <input
              id="casesCount"
              type="number"
              inputMode="numeric"
              min={1}
              {...register("casesCount")}
              className={inputClass}
              aria-invalid={!!errors.casesCount}
              aria-describedby={errors.casesCount ? "casesCount-error" : undefined}
            />
            <FieldError id="casesCount-error" message={errors.casesCount?.message} />
          </div>
          <div>
            <label htmlFor="ageGroup" className="text-sm font-semibold">
              Age group
            </label>
            <select id="ageGroup" {...register("ageGroup")} className={inputClass}>
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a}>
                  {AGE_GROUP_LABELS[a]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="observedAt" className="text-sm font-semibold">
              Observed at
            </label>
            <input
              id="observedAt"
              type="datetime-local"
              {...register("observedAt")}
              className={inputClass}
              aria-invalid={!!errors.observedAt}
              aria-describedby={errors.observedAt ? "observedAt-error" : undefined}
            />
            <FieldError id="observedAt-error" message={errors.observedAt?.message} />
          </div>
        </div>

        <div>
          <label htmlFor="symptoms" className="text-sm font-semibold">
            Symptoms <span className="font-normal text-muted">(optional, separate with commas)</span>
          </label>
          <input id="symptoms" placeholder="fever, cough" {...register("symptoms")} className={inputClass} />
          <FieldError id="symptoms-error" message={errors.symptoms?.message} />
        </div>

        <div>
          <label htmlFor="notes" className="text-sm font-semibold">
            Notes <span className="font-normal text-muted">(optional — do not include names or ID numbers)</span>
          </label>
          <textarea id="notes" rows={3} {...register("notes")} className={inputClass} />
          <FieldError id="notes-error" message={errors.notes?.message} />
        </div>

        <div className="rounded-xl bg-canvas p-4">
          <p className="text-sm font-semibold">Location</p>
          {latitude !== undefined && longitude !== undefined ? (
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <span className="font-mono text-ink">
                {Number(latitude).toFixed(5)}, {Number(longitude).toFixed(5)}
              </span>
              <Button type="button" variant="ghost" onClick={clearLocation} className="min-h-9">
                <MapPinOff className="size-4" aria-hidden /> Remove
              </Button>
            </div>
          ) : (
            <Button type="button" variant="secondary" onClick={captureLocation} loading={locating} className="mt-2">
              <LocateFixed className="size-4" aria-hidden /> Use my current location
            </Button>
          )}
          {locationError && <p className="mt-2 text-sm text-pending">{locationError}</p>}
          <FieldError id="latitude-error" message={errors.latitude?.message} />
        </div>
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => router.push("/reports")}>
          Cancel
        </Button>
        <Button type="submit" loading={isSubmitting}>
          Save report
        </Button>
      </div>
      <p className="text-right text-xs text-muted">
        Reports are saved on this device first and uploaded when a connection is available.
      </p>
    </form>
  );
}
