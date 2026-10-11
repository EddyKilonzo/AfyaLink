import { FilePlus2, LayoutDashboard, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { OfflinePhone } from "@/components/illustrations";
import { SiteFooter } from "@/components/site/site-footer";
import { ButtonLink } from "@/components/ui";

export const metadata: Metadata = { title: "Offline", robots: { index: false } };

/**
 * Served by the service worker when a page that was never saved on this
 * device is opened without a connection. Static: needs no network or session.
 */
export default function Page() {
  return (
    <>
      <main id="main" className="mx-auto flex min-h-[85dvh] max-w-md flex-col justify-center px-5 py-12">
        <Logo />
        <OfflinePhone className="mt-8 w-36 sm:w-44" />
        <h1 className="text-h1 mt-4">You&apos;re offline</h1>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
          This page isn&apos;t saved on this device yet. You can still record reports: they&apos;re kept on the phone and sync when you reconnect.
        </p>
        <div className="mt-8 grid gap-2">
          <ButtonLink href="/reports/new" size="lg" icon={<FilePlus2 className="size-[18px]" aria-hidden />}>
            Record a report
          </ButtonLink>
          <ButtonLink href="/sync" variant="outline" size="lg" icon={<RefreshCw className="size-4" aria-hidden />}>
            See what&apos;s waiting to sync
          </ButtonLink>
          <ButtonLink href="/dashboard" variant="ghost" size="lg" icon={<LayoutDashboard className="size-4" aria-hidden />}>
            Go to dashboard
          </ButtonLink>
        </div>
      </main>
      <SiteFooter variant="compact" />
    </>
  );
}
