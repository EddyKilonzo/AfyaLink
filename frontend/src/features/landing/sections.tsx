import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  CloudOff,
  EyeOff,
  FilePlus2,
  FlaskConical,
  HardDrive,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  UploadCloud,
} from "lucide-react";
import { DrawnBorder } from "@/components/brand/drawn-border";
import { HexTexture } from "@/components/brand/hex-texture";
import { CommunityCare, ConnectedVillages, SyncUpload } from "@/components/illustrations";
import { Reveal } from "@/components/motion";
import { ButtonAnchor, ButtonLink } from "@/components/ui";

/* ---------------------------------------------------------------- Features */

export function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-h2 text-brand-950">Built for the places where the signal drops.</h2>
          <p className="text-lead mt-4 text-muted">
            Volunteers shouldn&apos;t have to wait for a connection to do their job. AfyaLink keeps every report safe on the phone and gets it to the
            people who act on it.
          </p>
        </Reveal>

        {/* Bento: four features, four different shapes */}
        <div className="mt-12 grid gap-4 md:grid-cols-6 lg:mt-16">
          <Reveal className="md:col-span-4">
            <article className="relative h-full overflow-hidden rounded-[var(--radius-2xl)] bg-brand-900 p-7 text-white shadow-[var(--shadow-lg)] sm:p-9">
              <HexTexture tone="dark" />
              <div className="relative grid gap-8 lg:grid-cols-[1fr_17.5rem] lg:items-end">
                <div>
                  <CloudOff className="size-6 text-brand-200" aria-hidden />
                  <h3 className="mt-5 text-2xl font-semibold tracking-tight">Offline-first reporting</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-brand-100">
                    A report is saved on the device the moment it&apos;s recorded. Close the app, lose signal, restart the phone: it&apos;s still there.
                  </p>
                </div>
                <ul className="space-y-2" aria-label="Example queue">
                  {[
                    { t: "Malaria, 3 cases", s: "Saved on device" },
                    { t: "Missed antenatal visit", s: "Saved on device" },
                  ].map((r) => (
                    <li key={r.t} className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.07] px-3 py-2.5 text-sm ring-1 ring-inset ring-white/10">
                      <span className="min-w-0 leading-snug">{r.t}</span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-amber">
                        <Clock className="size-3" aria-hidden /> {r.s}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </Reveal>

          <Reveal className="md:col-span-2" delay={0.06}>
            <article className="h-full rounded-[var(--radius-2xl)] bg-surface p-7 shadow-[var(--shadow-ring),var(--shadow-sm)]">
              <RefreshCw className="size-6 text-brand-600" aria-hidden />
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">Reliable synchronization</h3>
              <p className="mt-3 leading-relaxed text-muted">Uploads resume on their own. Retrying can never create a duplicate, and nothing is marked sent until the server says so.</p>
              <ol className="mt-6 flex items-center gap-1.5" aria-label="Retry timeline example">
                {["Waiting", "Retry", "Retry", "Confirmed"].map((s, i) => (
                  <li key={i} className="flex flex-1 flex-col items-center gap-1.5">
                    <span className={i === 3 ? "h-1.5 w-full rounded-full bg-success" : "h-1.5 w-full rounded-full bg-amber/60"} aria-hidden />
                    <span className="text-[0.6875rem] text-muted">{s}</span>
                  </li>
                ))}
              </ol>
            </article>
          </Reveal>

          <Reveal className="md:col-span-3" delay={0.04}>
            <article className="relative h-full overflow-hidden rounded-[var(--radius-2xl)] bg-surface p-7 shadow-[var(--shadow-ring),var(--shadow-sm)]">
              <div className="flex items-start justify-between gap-6">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-ink">Community health mapping</h3>
                  <p className="mt-3 max-w-sm leading-relaxed text-muted">See where cases cluster, as markers or a heat map. Notes, symptoms and who reported never appear on the map.</p>
                </div>
              </div>
              <HeatIllustration />
            </article>
          </Reveal>

          <Reveal className="md:col-span-3" delay={0.08}>
            <article className="h-full rounded-[var(--radius-2xl)] bg-brand-50 p-7 shadow-[var(--shadow-ring),var(--shadow-sm)]">
              <BarChart3 className="size-6 text-brand-600" aria-hidden />
              <h3 className="mt-5 text-xl font-semibold tracking-tight text-ink">Actionable dashboards</h3>
              <p className="mt-3 max-w-sm leading-relaxed text-muted">Trends by day, county and condition, plus a review queue so every report is read and followed up.</p>
              <div className="mt-6 flex h-24 items-end gap-2" aria-hidden>
                {[38, 52, 44, 66, 58, 80, 72, 92].map((h, i) => (
                  <span key={i} className="flex-1 rounded-t-md bg-[#0b8f72]" style={{ height: `${h}%`, opacity: 0.45 + i * 0.07 }} />
                ))}
              </div>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function HeatIllustration() {
  const blobs = [
    { x: 30, y: 58, r: 34, c: "#c43d4b", o: 0.55 },
    { x: 34, y: 54, r: 52, c: "#f3b66a", o: 0.5 },
    { x: 70, y: 40, r: 30, c: "#1d8a70", o: 0.55 },
    { x: 58, y: 70, r: 22, c: "#80cfb1", o: 0.6 },
    { x: 84, y: 66, r: 18, c: "#80cfb1", o: 0.5 },
  ];
  return (
    <div className="relative mt-6 h-40 overflow-hidden rounded-2xl bg-sunken ring-1 ring-inset ring-line" aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <defs>
          <filter id="heat-blur">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <path d="M0 30 Q 30 20 50 35 T 100 28" stroke="#cfdad4" strokeWidth="0.6" fill="none" vectorEffect="non-scaling-stroke" />
        <path d="M0 75 Q 40 62 60 80 T 100 70" stroke="#cfdad4" strokeWidth="0.6" fill="none" vectorEffect="non-scaling-stroke" />
        <g filter="url(#heat-blur)">
          {blobs.map((b, i) => (
            <ellipse key={i} cx={b.x} cy={b.y} rx={b.r / 2} ry={b.r / 2.6} fill={b.c} opacity={b.o} />
          ))}
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------ How it works */

const STEPS = [
  { Icon: FilePlus2, title: "Capture", text: "A volunteer records what they saw in under a minute: condition, severity, number of cases." },
  { Icon: HardDrive, title: "Save offline", text: "The report is stored on the phone straight away, with or without a signal." },
  { Icon: UploadCloud, title: "Synchronize", text: "When the connection returns, reports upload by themselves and are confirmed by the server." },
  { Icon: ClipboardCheck, title: "Review", text: "Administrators review each report, see trends and maps, and record the action taken." },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y border-line bg-surface py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="grid items-end gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
          <Reveal className="max-w-2xl">
            <h2 className="text-h2 text-brand-950">From a home visit to a health decision.</h2>
            <p className="text-lead mt-4 text-muted">Four steps, and the volunteer only has to do the first one.</p>
          </Reveal>
          <Reveal delay={0.06} className="max-md:hidden">
            <CommunityCare className="w-full" />
          </Reveal>
        </div>

        <ol className="relative mt-14 grid gap-10 md:grid-cols-4 md:gap-6">
          {/* Connecting line: vertical on phones, horizontal from tablet up */}
          <span className="absolute bottom-6 left-[1.4375rem] top-6 w-px bg-brand-200 md:hidden" aria-hidden />
          <span className="absolute left-6 right-6 top-[1.4375rem] hidden h-px bg-line-strong md:block" aria-hidden />
          <svg preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute left-6 right-6 top-[1.4375rem] hidden h-px md:block">
            <line x1="0" y1="0" x2="100%" y2="0" stroke="rgb(20 108 90 / 0.7)" strokeWidth="2" pathLength="1" strokeDasharray="1" strokeDashoffset="1" style={{ animation: "border-draw 1.6s var(--ease-out) 120ms forwards" }} />
          </svg>
          {/* Flowing pulse that rides the drawn line once the entrance finishes. */}
          <svg preserveAspectRatio="none" aria-hidden className="pointer-events-none absolute left-6 right-6 top-[1.4375rem] hidden h-px md:block">
            <line x1="0" y1="0" x2="100%" y2="0" stroke="rgb(33 134 91 / 0.9)" strokeWidth="3" pathLength="1" strokeDasharray="0.25 0.4" style={{ animation: "flow 2.4s var(--ease-out) 1.8s infinite" }} />
          </svg>
          {STEPS.map(({ Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.08} className="relative flex gap-5 md:flex-col md:gap-0">
              <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-2xl bg-surface text-brand-600 shadow-[var(--shadow-ring),var(--shadow-sm)]">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="md:mt-6">
                <p className="text-sm font-semibold tabular-nums text-brand-600">Step {i + 1}</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-ink">{title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{text}</p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- Showcase */

export function Showcase() {
  return (
    <section id="platform" className="relative scroll-mt-20 overflow-hidden bg-brand-950 py-20 text-white sm:py-28">
      <HexTexture tone="dark" />
      <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal className="max-w-2xl">
          <h2 className="text-h2 text-white">One report, two views.</h2>
          <p className="text-lead mt-4 text-brand-100">
            Volunteers get a simple phone app that works anywhere. Administrators get the full picture as reports arrive.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <Reveal>
            <article className="flex h-full flex-col rounded-[var(--radius-2xl)] bg-white/[0.05] p-6 ring-1 ring-inset ring-white/10 backdrop-blur sm:p-8">
              <Smartphone className="size-6 text-brand-200" aria-hidden />
              <h3 className="mt-5 text-xl font-semibold tracking-tight">For volunteers</h3>
              <ul className="mt-5 space-y-3 text-brand-100">
                {["Record a report in about a minute", "See exactly what's waiting to sync", "Correct a report within 72 hours", "Your own map and weekly numbers"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <SyncUpload className="mx-auto mt-8 w-full max-w-[17rem] lg:mt-auto lg:pt-8" />
            </article>
          </Reveal>
          <Reveal delay={0.08}>
            <article className="h-full rounded-[var(--radius-2xl)] bg-surface p-6 text-ink shadow-[var(--shadow-xl)] sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-semibold tracking-tight">For administrators</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-amber bg-amber-soft px-2 py-0.5 text-[0.6875rem] font-semibold text-amber-ink">
                  <FlaskConical className="size-3" aria-hidden /> Example figures
                </span>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { k: "Awaiting review", v: "14" },
                  { k: "Reports, 30 days", v: "312" },
                  { k: "Counties", v: "4" },
                ].map((s) => (
                  <div key={s.k} className="rounded-2xl bg-sunken p-4 last:max-sm:col-span-2">
                    <p className="text-xs text-muted">{s.k}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">{s.v}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-6 grid gap-3 text-muted sm:grid-cols-2">
                {["Review queue that only moves forward", "Trends by day, county and condition", "Heat map of where cases cluster", "CSV export and a full audit log"].map((t) => (
                  <li key={t} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- FAQ */

const FAQ_ITEMS = [
  {
    q: "Do I need an internet connection to use AfyaLink?",
    a: "No. Volunteers record reports offline and they are saved on the device immediately. When the connection returns, the app uploads them automatically and confirms each one with the server.",
  },
  {
    q: "Is my patients' information safe?",
    a: "AfyaLink is privacy by design. No patient names are stored. Maps show aggregate, non-identifying information only, and every administrative action is recorded in an audit log.",
  },
  {
    q: "What happens if a report fails to sync?",
    a: "The app retries with automatic back-off and never creates a duplicate. A report is only marked sent once the server confirms it, so nothing is silently lost.",
  },
  {
    q: "Who can see the reports?",
    a: "Only the health team your administrator invited. Volunteers see their own reports and map; administrators see the full picture across their area.",
  },
  {
    q: "Can I correct a report after saving it?",
    a: "Yes, volunteers can edit their own reports for up to 72 hours after recording. After that, only an administrator can update it and must record why.",
  },
  {
    q: "Is AfyaLink connected to the national health system?",
    a: "AfyaLink is an academic prototype. It is not connected to national health information systems, and all data shown on the public site is synthetic.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <Reveal className="text-center">
          <h2 className="text-h2 text-brand-950">Questions, answered plainly.</h2>
          <p className="text-lead mt-4 text-muted">The things community health teams ask us most often.</p>
        </Reveal>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map(({ q, a }, i) => (
            <Reveal key={q} as="article" delay={i * 0.05} className="rounded-[var(--radius-xl)] bg-surface shadow-[var(--shadow-ring),var(--shadow-sm)]">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left">
                  <span className="text-base font-semibold tracking-tight text-ink">{q}</span>
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600 transition-transform group-open:rotate-45" aria-hidden>
                    <span className="text-xl leading-none font-light">+</span>
                  </span>
                </summary>
                <div className="px-6 pb-5 text-muted">
                  <p>{a}</p>
                </div>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Impact */

const PRINCIPLES = [
  { Icon: EyeOff, title: "Privacy by design", text: "No patient names. Maps show aggregate, non-identifying information only, and every admin action is audited." },
  { Icon: CloudOff, title: "Made for low connectivity", text: "Small uploads, automatic retries with back-off, and nothing lost when the network disappears." },
  { Icon: ShieldCheck, title: "Honest about data", text: "Reports count as received only after the server confirms them. Development uses synthetic data only." },
];

export function Impact() {
  return (
    <section id="impact" className="scroll-mt-20 py-20 sm:py-28">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
        <Reveal>
          <h2 className="text-h2 text-brand-950">Faster action starts closer to home.</h2>
          <p className="text-lead mt-5 text-muted">
            Community health volunteers are often the first to notice an outbreak, a missed vaccination or a contaminated water source. AfyaLink exists
            so that what they see reaches the people who can respond, quickly and reliably.
          </p>
          <p className="mt-5 text-sm text-muted">AfyaLink is an academic prototype. It is not connected to national health information systems.</p>
          <ConnectedVillages className="mt-10 w-full max-w-md" />
        </Reveal>
        <ul className="grid gap-4">
          {PRINCIPLES.map(({ Icon, title, text }, i) => (
            <Reveal as="li" key={title} delay={i * 0.07}>
              <div className="flex gap-5 rounded-[var(--radius-xl)] bg-surface p-6 shadow-[var(--shadow-ring),var(--shadow-xs)]">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight text-ink">{title}</h3>
                  <p className="mt-1.5 leading-relaxed text-muted">{text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- CTA, footer */

export function FinalCta() {
  return (
    <section className="px-5 pb-20 sm:px-8 sm:pb-28">
      <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-brand-600 px-6 py-16 text-center text-white shadow-[var(--shadow-xl)] sm:px-12 sm:py-20">
        <HexTexture tone="dark" />
        <DrawnBorder radius={32} tone="dark" />
        <div className="relative">
          <h2 className="text-display mx-auto max-w-3xl !text-[clamp(2.25rem,1.6rem+3vw,3.75rem)] text-white">Start with one report.</h2>
          <p className="text-lead mx-auto mt-5 max-w-xl text-brand-100">Sign in with the account your health team created for you, and record your first report today, online or not.</p>
          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/login" variant="inverse" size="lg" trailingIcon={<ArrowRight className="size-4" aria-hidden />}>
              Get started
            </ButtonLink>
            <ButtonAnchor href="#how-it-works" variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">
              See how it works
            </ButtonAnchor>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
