import { ArrowRight, BookOpen, Keyboard, MapPinned, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import Link from "next/link";
import { Panel, PageHeader } from "@/components/ui";
import { FAQ } from "@/features/landing/sections";

export default function HelpPage() {
  return (
    <>
      <PageHeader
        title="Help"
        description="Shortcuts, how sync works, and answers to the questions community health teams ask us most often."
      />

      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <Panel>
            <div className="flex items-center gap-2 px-5 pt-5 sm:px-6">
              <Keyboard className="size-5 text-brand-600" aria-hidden />
              <h2 className="text-h3">Keyboard shortcuts</h2>
            </div>
            <dl className="divide-y divide-line px-5 py-3 sm:px-6">
              {[
                ["N", "Record a new health report"],
                ["S", "Go to Sync & offline"],
                ["M", "Open the disease map"],
                ["?", "Show this help page"],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between gap-4 py-2.5 text-sm">
                  <dt className="font-medium text-ink">{desc}</dt>
                  <dd>
                    <kbd className="grid size-7 place-items-center rounded-md bg-sunken font-semibold text-ink ring-1 ring-line">{key}</kbd>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="px-5 pb-5 text-xs text-muted sm:px-6">Shortcuts are ignored while you're typing in a field.</p>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 px-5 pt-5 sm:px-6">
              <RefreshCw className="size-5 text-brand-600" aria-hidden />
              <h2 className="text-h3">How offline sync works</h2>
            </div>
            <ol className="divide-y divide-line px-5 py-3 sm:px-6">
              {[
                { icon: Smartphone, title: "Record", desc: "Reports are saved on this device straight away, with or without a connection." },
                { icon: RefreshCw, title: "Sync", desc: "When the connection returns, reports upload by themselves and are confirmed by the server." },
                { icon: ShieldCheck, title: "Review", desc: "Administrators review each report, see trends and maps, and record the action taken." },
              ].map(({ icon: Icon, title, desc }, i) => (
                <li key={title} className="flex gap-3 py-2.5 text-sm">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100">
                    <span className="text-xs font-semibold">{i + 1}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium text-ink">
                      <Icon className="size-4 text-muted" aria-hidden /> {title}
                    </span>
                    <p className="mt-0.5 text-muted">{desc}</p>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <div className="flex items-center gap-2 px-5 pt-5 sm:px-6">
              <BookOpen className="size-5 text-brand-600" aria-hidden />
              <h2 className="text-h3">Guides</h2>
            </div>
            <ul className="divide-y divide-line px-2 py-2">
              {[
                ["/reports/new", "Recording a report", "What each field means and how symptoms map to conditions."],
                ["/sync", "Sync & offline", "What's on this device, what's on the server, and how to fix failures."],
                ["/maps", "Disease map", "How to read the heat layer and drill into an area."],
                ["/admin", "Admin overview", "How to review reports and manage your team."],
              ].map(([href, title, desc]) => (
                <li key={href}>
                  <Link href={href} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-sunken">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{title}</span>
                      <span className="block truncate text-xs text-muted">{desc}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <div className="flex items-center gap-2 px-5 pt-5 sm:px-6">
              <MapPinned className="size-5 text-brand-600" aria-hidden />
              <h2 className="text-h3">Need a hand?</h2>
            </div>
            <p className="px-5 pb-5 pt-3 text-sm leading-relaxed text-muted sm:px-6">
              AfyaLink is built by the community health team at Kilo. If something feels broken, open an issue on GitHub or ask your administrator — they can see the audit log for your account.
            </p>
          </Panel>
        </div>
      </div>

      <div className="mt-10">
        <FAQ />
      </div>
    </>
  );
}