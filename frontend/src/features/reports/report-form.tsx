"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useLiveQuery } from "dexie-react-hooks";
import { CheckCircle2, LocateFixed, MapPinOff, Minus, Plus, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { EASE_OUT } from "@/components/motion";
import {
  Button,
  ButtonLink,
  describedBy,
  ErrorState,
  Field,
  FieldError,
  FormSection,
  Input,
  Panel,
  Select,
  StatusIndicator,
  Textarea,
} from "@/components/ui";
import { cx } from "@/components/ui/cx";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { useLocations } from "@/features/locations/hooks";
import { useSync } from "@/features/sync/sync-context";
import { saveReportLocally } from "@/features/sync/sync-engine";
import { deleteMeta, getDb, getMeta, setMeta } from "@/lib/db";
import { formatLocation } from "@/services/locations.service";
import {
  AGE_GROUPS,
  AGE_GROUP_LABELS,
  CATEGORY_LABELS,
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  SEVERITY_LABELS,
  type ReportSeverity,
  type ServerReport,
} from "@/types";
import { useCorrectReport } from "./hooks";
import { CATEGORY_ICONS } from "./report-row";
import { CONDITION_SUGGESTIONS, parseSymptoms, reportFormSchema, type ReportFormInput, type ReportFormValues } from "./report-schema";
import { sanitizeList, sanitizeText } from "@/lib/sanitize";
import { Stepper } from "@/components/stepper";

/** ISO instant → value for <input type="datetime-local"> in the device's time zone. */
function toLocalInput(date: Date): string {
  const local = new Date(date);
  local.setMinutes(local.getMinutes() - local.getTimezoneOffset());
  return local.toISOString().slice(0, 16);
}

const localDateTimeNow = () => toLocalInput(new Date());
const numberOrUndefined = (value: string | null) => (value === null || value === "" ? undefined : Number(value));

function defaultsFrom(report: ServerReport): ReportFormInput {
  return {
    category: report.category,
    conditionName: report.conditionName,
    severity: report.severity,
    casesCount: report.casesCount,
    ageGroup: report.ageGroup,
    symptoms: report.symptoms?.join(", ") ?? "",
    notes: report.notes ?? "",
    locationId: report.locationId ?? undefined,
    latitude: numberOrUndefined(report.latitude),
    longitude: numberOrUndefined(report.longitude),
    observedAt: toLocalInput(new Date(report.observedAt)),
  };
}

const SEVERITY_STYLE: Record<ReportSeverity, { dot: string; selected: string }> = {
  LOW: { dot: "bg-sev-low", selected: "border-sev-low/60 bg-[#f1f7e8] text-[#3d630b]" },
  MODERATE: { dot: "bg-sev-moderate", selected: "border-sev-moderate/50 bg-amber-soft text-amber-ink" },
  HIGH: { dot: "bg-sev-high", selected: "border-sev-high/50 bg-[#fdeee4] text-[#9a3412]" },
  CRITICAL: { dot: "bg-sev-critical", selected: "border-sev-critical/50 bg-failed-bg text-failed" },
};

const draftKey = (userId: string) => `draft:${userId}`;

/**
 * Create mode saves to IndexedDB first and syncs in the background; the
 * in-progress draft is kept on this device too. Edit mode (CHV correction of
 * a server report) is a direct PATCH and needs a connection.
 */
export function ReportForm({ report }: { report?: ServerReport } = {}) {
  const editing = Boolean(report);
  const { user } = useAuth();
  const { online, syncNow } = useSync();
  const router = useRouter();
  const toast = useToast();
  const locations = useLocations();
  const correct = useCorrectReport();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null);
  const draftLoaded = useRef(editing);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReportFormInput, unknown, ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: report
      ? defaultsFrom(report)
      : {
          category: "DISEASE_CASE",
          severity: "LOW",
          ageGroup: "MIXED",
          casesCount: 1,
          locationId: user?.locationId ?? undefined,
          observedAt: localDateTimeNow(),
        },
  });

  const values = useWatch({ control });
  const { category, severity, latitude, longitude, notes } = values;

  // Restore an unfinished draft from this device (create mode only).
  useEffect(() => {
    if (editing || !user) return;
    let cancelled = false;
    void getMeta<ReportFormInput>(draftKey(user.id)).then((draft) => {
      if (cancelled) return;
      if (draft) {
        reset({ ...draft, observedAt: draft.observedAt || localDateTimeNow() });
        toast.info("Draft restored", "We kept the report you started earlier.");
      }
      draftLoaded.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [editing, user, reset, toast]);

  // Keep the draft on this device as the person types (debounced).
  useEffect(() => {
    if (editing || !user || !draftLoaded.current || savedId) return;
    const timer = setTimeout(() => {
      void setMeta(draftKey(user.id), getValues()).then(() => setDraftSavedAt(Date.now()));
    }, 700);
    return () => clearTimeout(timer);
  }, [values, editing, user, savedId, getValues]);

  function captureLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("This device can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude", Number(pos.coords.latitude.toFixed(6)), { shouldDirty: true });
        setValue("longitude", Number(pos.coords.longitude.toFixed(6)), { shouldDirty: true });
        setLocating(false);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission is off. You can still save the report without it."
            : "Couldn't get your location. You can still save the report without it.",
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 60_000 },
    );
  }

  function stepCases(delta: number) {
    const current = Number(getValues("casesCount")) || 0;
    setValue("casesCount", Math.min(10_000, Math.max(1, current + delta)), { shouldValidate: true, shouldDirty: true });
  }

  async function onCreate(v: ReportFormValues) {
    if (!user) return;
    setSubmitError(null);
    try {
      const id = crypto.randomUUID();
      await saveReportLocally(user.id, {
        id,
        category: v.category,
        conditionName: sanitizeText(v.conditionName, 120),
        severity: v.severity,
        casesCount: v.casesCount,
        ageGroup: v.ageGroup,
        symptoms: sanitizeList(parseSymptoms(v.symptoms)),
        notes: sanitizeText(v.notes, 2000) || undefined,
        locationId: v.locationId,
        latitude: v.latitude,
        longitude: v.longitude,
        observedAt: new Date(v.observedAt).toISOString(),
        clientCreatedAt: new Date().toISOString(),
      });
      await deleteMeta(draftKey(user.id));
      setDraftSavedAt(null);
      setSavedId(id);
      reset({ ...v, conditionName: "", symptoms: "", notes: "", casesCount: 1, latitude: undefined, longitude: undefined, observedAt: localDateTimeNow() });
      window.scrollTo({ top: 0, behavior: "smooth" });
      // Saved locally first; the upload is attempted in the background.
      if (online) void syncNow();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "The report couldn't be saved on this device.");
    }
  }

  async function onCorrect(v: ReportFormValues) {
    if (!report) return;
    const updated = await correct.run(report.id, {
      category: v.category,
      conditionName: sanitizeText(v.conditionName, 120),
      severity: v.severity,
      casesCount: v.casesCount,
      ageGroup: v.ageGroup,
      symptoms: sanitizeList(parseSymptoms(v.symptoms)) ?? null,
      notes: sanitizeText(v.notes, 2000) || null,
      locationId: v.locationId ?? null,
      latitude: v.latitude ?? null,
      longitude: v.longitude ?? null,
      observedAt: new Date(v.observedAt).toISOString(),
    });
    if (updated) {
      toast.success("Correction saved", "The server has the updated report.");
      router.push(`/reports/${updated.id}`);
    }
  }

  if (savedId) return <SavedConfirmation id={savedId} onAnother={() => setSavedId(null)} />;

  const hasGps = latitude !== undefined && longitude !== undefined && latitude !== null && longitude !== null;

  return (
    <form onSubmit={handleSubmit(editing ? onCorrect : onCreate)} noValidate className="pb-28 md:pb-0">
      <div className="space-y-4">
        {submitError && <ErrorState message={submitError} />}
        {correct.error && <ErrorState message={correct.error} />}
        {editing && !online && (
          <p role="status" className="rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-ink ring-1 ring-inset ring-amber/40">
            Corrections go straight to the server. Connect to the internet to save them.
          </p>
        )}
      </div>

      <Panel className="mt-4 p-5 sm:p-7">
        <div className="space-y-8">
          <FormSection title="What did you see?" description="Choose the closest category, then name the condition.">
            <fieldset>
              <legend className="sr-only">Category</legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REPORT_CATEGORIES.map((c) => {
                  const Icon = CATEGORY_ICONS[c];
                  const selected = category === c;
                  return (
                    <label
                      key={c}
                      className={cx(
                        "relative flex min-h-[4.5rem] cursor-pointer flex-col justify-between gap-2 rounded-[14px] border p-3 text-sm font-semibold",
                        "transition-[border-color,background-color,box-shadow,transform] duration-[var(--duration-micro)] active:scale-[0.97] has-[:focus-visible]:shadow-[var(--shadow-glow)]",
                        selected ? "border-brand-500 bg-brand-50 text-brand-800 shadow-xs" : "border-line bg-surface text-ink hover:border-brand-200",
                      )}
                    >
                      <input type="radio" value={c} {...register("category")} className="sr-only" />
                      <Icon className={cx("size-5", selected ? "text-brand-600" : "text-muted")} aria-hidden />
                      <span className="leading-tight">{CATEGORY_LABELS[c]}</span>
                      {selected && (
                        <motion.span
                          initial={{ scale: 0.4, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2, ease: EASE_OUT }}
                          className="absolute right-2.5 top-2.5 grid size-5 place-items-center rounded-full bg-brand-600 text-white"
                          aria-hidden
                        >
                          <Check className="size-3" strokeWidth={3} />
                        </motion.span>
                      )}
                    </label>
                  );
                })}
              </div>
              <FieldError id="category-error" message={errors.category?.message} />
            </fieldset>

            <Field name="conditionName" label="Condition or issue" required error={errors.conditionName?.message} hint="Pick a suggestion or type your own.">
              <Input
                id="conditionName"
                list="condition-suggestions"
                autoComplete="off"
                placeholder="e.g. Malaria"
                {...register("conditionName")}
                aria-invalid={!!errors.conditionName}
                aria-describedby={describedBy("conditionName", errors.conditionName?.message, true)}
              />
              <datalist id="condition-suggestions">
                {CONDITION_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
          </FormSection>

          <FormSection title="How serious is it?">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">
                Severity <span className="text-error" aria-hidden>*</span>
              </legend>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {REPORT_SEVERITIES.map((s) => {
                  const selected = severity === s;
                  return (
                    <label
                      key={s}
                      className={cx(
                        "flex min-h-12 cursor-pointer items-center gap-2.5 rounded-[12px] border px-3.5 text-sm font-semibold transition-[background-color,border-color,color,transform] duration-[var(--duration-micro)] active:scale-[0.97] has-[:focus-visible]:shadow-[var(--shadow-glow)]",
                        selected ? SEVERITY_STYLE[s].selected : "border-line bg-surface text-muted hover:border-line-strong hover:text-ink",
                      )}
                    >
                      <input type="radio" value={s} {...register("severity")} className="sr-only" />
                      <span className={cx("size-2.5 rounded-full transition-transform duration-[var(--duration-ui)] ease-[var(--ease-out)]", SEVERITY_STYLE[s].dot, selected && "scale-[1.35]")} aria-hidden />
                      {SEVERITY_LABELS[s]}
                    </label>
                  );
                })}
              </div>
              <FieldError id="severity-error" message={errors.severity?.message} />
            </fieldset>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="casesCount" label="Number of cases" required error={errors.casesCount?.message}>
                <div className="mt-1.5 flex items-stretch overflow-hidden rounded-[10px] border border-line-strong bg-surface shadow-xs focus-within:border-brand-500 focus-within:shadow-[var(--shadow-glow)]">
                  <button type="button" onClick={() => stepCases(-1)} className="grid w-12 place-items-center text-muted transition-colors hover:bg-sunken hover:text-ink" aria-label="One fewer case">
                    <Minus className="size-4" aria-hidden />
                  </button>
                  <input
                    id="casesCount"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    {...register("casesCount")}
                    className="min-h-12 w-full border-x border-line bg-transparent text-center text-base font-semibold tabular-nums text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    aria-invalid={!!errors.casesCount}
                    aria-describedby={describedBy("casesCount", errors.casesCount?.message)}
                  />
                  <button type="button" onClick={() => stepCases(1)} className="grid w-12 place-items-center text-muted transition-colors hover:bg-sunken hover:text-ink" aria-label="One more case">
                    <Plus className="size-4" aria-hidden />
                  </button>
                </div>
              </Field>
              <Field name="ageGroup" label="Age group" required>
                <Select id="ageGroup" {...register("ageGroup")}>
                  {AGE_GROUPS.map((a) => (
                    <option key={a} value={a}>
                      {AGE_GROUP_LABELS[a]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </FormSection>

          <FormSection title="When and where">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field name="observedAt" label="Observed at" required error={errors.observedAt?.message}>
                <Input
                  id="observedAt"
                  type="datetime-local"
                  max={localDateTimeNow()}
                  {...register("observedAt")}
                  aria-invalid={!!errors.observedAt}
                  aria-describedby={describedBy("observedAt", errors.observedAt?.message)}
                />
              </Field>
              <Field name="locationId" label="Area" optional error={errors.locationId?.message} hint={locations.error && !locations.data ? "Areas couldn't load. You can still save." : undefined}>
                <Select id="locationId" {...register("locationId")} disabled={!locations.data} aria-invalid={!!errors.locationId}>
                  <option value="">{locations.loading && !locations.data ? "Loading areas…" : "Not specified"}</option>
                  {locations.data?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {formatLocation(l)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="rounded-2xl bg-sunken p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">GPS position</p>
                  <p className="text-[0.8125rem] text-muted">{hasGps ? `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}` : "Optional. Helps the disease map."}</p>
                </div>
                {hasGps ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setValue("latitude", undefined);
                      setValue("longitude", undefined);
                    }}
                    icon={<MapPinOff className="size-4" aria-hidden />}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={captureLocation} loading={locating} icon={<LocateFixed className="size-4" aria-hidden />}>
                    Use my location
                  </Button>
                )}
              </div>
              {locationError && <p className="mt-2 text-[0.8125rem] text-amber-ink">{locationError}</p>}
              <FieldError id="latitude-error" message={errors.latitude?.message} />
            </div>
          </FormSection>

          <FormSection title="Details" description="Optional, but helpful for whoever reviews the report.">
            <Field name="symptoms" label="Symptoms" optional hint="Separate with commas, e.g. fever, cough" error={errors.symptoms?.message}>
              <Input id="symptoms" placeholder="fever, cough" {...register("symptoms")} aria-describedby={describedBy("symptoms", errors.symptoms?.message, true)} />
            </Field>
            <Field name="notes" label="Notes" optional error={errors.notes?.message}>
              <Textarea id="notes" rows={3} maxLength={2000} {...register("notes")} aria-describedby="notes-privacy" />
              <p id="notes-privacy" className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] text-muted">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden />
                Don&apos;t include names, phone numbers or ID numbers.
                <span className="ml-auto shrink-0 tabular-nums">{(notes ?? "").length}/2000</span>
              </p>
            </Field>
          </FormSection>
        </div>
      </Panel>

      {/* Sticky on phones (above the tab bar), inline from tablet up */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-20 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur-xl md:static md:mt-6 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0 flex-1 text-[0.8125rem] text-muted">
            <AnimatePresence mode="wait" initial={false}>
              {editing ? (
                <motion.span key="edit" className="max-md:hidden">Changes are sent to the server when you save.</motion.span>
              ) : draftSavedAt ? (
                <motion.span key="draft" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="inline-flex items-center gap-1.5">
                  <StatusIndicator state="draft" label="Draft kept on this device" className="max-sm:hidden" />
                  <span className="sm:hidden">Draft kept</span>
                </motion.span>
              ) : (
                <motion.span key="hint" className="max-md:hidden">Saved on this device first, then uploaded.</motion.span>
              )}
            </AnimatePresence>
          </div>
          <Button type="button" variant="ghost" className="max-sm:hidden" onClick={() => router.push(report ? `/reports/${report.id}` : "/reports")}>
            Cancel
          </Button>
          <Button type="submit" size="lg" loading={isSubmitting || correct.pending} disabled={editing && !online} className="max-sm:flex-1">
            {editing ? "Save correction" : "Save report"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/**
 * Shown after saving. Follows the real state of this one report on the device:
 * it only says "received by the server" once the server has confirmed it.
 */
function SavedConfirmation({ id, onAnother }: { id: string; onAnother: () => void }) {
  const row = useLiveQuery(() => getDb().reports.get(id), [id]);
  const state = row?.syncState ?? "pending";
  const copy = {
    pending: { title: "Saved on this device", body: "It will upload automatically as soon as there's a connection. You can keep working." },
    syncing: { title: "Saved, now uploading", body: "Sending it to the server. You can keep working." },
    synced: { title: "Received by the server", body: "The server confirmed it. Your supervisor can now review it." },
    failed: { title: "Saved, but not sent", body: row?.lastError ?? "The server didn't accept it. Open Sync to see why." },
  }[state];

  return (
    <Panel className="overflow-hidden">
      <div className="flex flex-col items-center px-6 py-10 text-center sm:py-14">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.45, ease: EASE_OUT }}
          className={cx(
            "grid size-16 place-items-center rounded-[22px] shadow-[var(--shadow-md)]",
            state === "synced" ? "bg-success text-white" : state === "failed" ? "bg-failed-bg text-failed" : "bg-brand-50 text-brand-600 ring-1 ring-brand-100",
          )}
        >
          <CheckCircle2 className="size-8" aria-hidden />
        </motion.span>
        <div role="status" aria-live="polite" className="mt-5">
          <AnimatePresence mode="wait">
            <motion.div key={state} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.22, ease: EASE_OUT }}>
              <h2 className="text-h2 !text-[1.625rem]">{copy.title}</h2>
              <p className="mx-auto mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-muted">{copy.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <Stepper
          className="mt-6 w-full max-w-xs"
          steps={[{ label: "On device" }, { label: "On server" }]}
          current={state === "synced" ? 1 : state === "failed" ? 1 : 0}
        />

        <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button size="lg" onClick={onAnother}>
            Record another
          </Button>
          <ButtonLink href="/sync" variant="outline" size="lg">
            View sync status
          </ButtonLink>
        </div>
      </div>
    </Panel>
  );
}

function Step({ label, done, active, failed }: { label: string; done?: boolean; active?: boolean; failed?: boolean }) {
  return (
    <li
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ring-inset transition-colors duration-[var(--duration-ui)]",
        failed ? "bg-failed-bg text-failed ring-failed/15" : done ? "bg-synced-bg text-synced ring-synced/15" : active ? "bg-syncing-bg text-syncing ring-syncing/15" : "bg-sunken text-muted ring-line",
      )}
    >
      {done ? <CheckCircle2 className="size-3.5" strokeWidth={3} aria-hidden /> : <span className={cx("size-1.5 rounded-full bg-current", active && "animate-pulse")} aria-hidden />}
      {label}
    </li>
  );
}
