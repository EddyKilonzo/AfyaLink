import { CloudOff, MapPinned, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { DrawnBorder } from "@/components/brand/drawn-border";
import { HexTexture } from "@/components/brand/hex-texture";
import { VolunteerField } from "@/components/illustrations";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

const POINTS = [
  { Icon: CloudOff, text: "Record reports with or without a signal" },
  { Icon: RefreshCw, text: "They upload by themselves when you reconnect" },
  { Icon: MapPinned, text: "Your supervisors see them on live maps" },
];

export default function Page() {
  return (
    <>
      <main id="main" className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* Brand side: compact band on phones and tablets, full panel on desktop */}
        <section className="relative m-2 overflow-hidden rounded-[28px] bg-brand-900 px-6 pb-10 pt-6 text-white shadow-[var(--shadow-lg)] sm:m-3 sm:px-10 lg:flex lg:flex-col lg:justify-between lg:rounded-[36px] lg:p-14">
          <HexTexture tone="dark" />
          <DrawnBorder radius={28} tone="dark" className="lg:hidden" />
          <DrawnBorder radius={36} tone="dark" className="max-lg:hidden" />
          <Link href="/" className="relative inline-flex" aria-label="AfyaLink home">
            <Logo tone="light" />
          </Link>
          <div className="relative mt-8 max-w-md lg:mt-0">
            <h1 className="text-h2 text-white">Every report counts, even the ones made offline.</h1>
            <ul className="mt-8 hidden space-y-4 lg:block">
              {POINTS.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-[0.9375rem] text-brand-100">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
            {/* Desktop only, and only when there is room for it beside the form */}
            <VolunteerField className="mt-10 w-full max-w-sm max-lg:hidden [@media(max-height:780px)]:hidden" />
          </div>
          <p className="relative hidden text-xs text-brand-200 lg:block">An academic prototype. Development data is synthetic.</p>
        </section>
  
        <section className="flex items-start justify-center px-5 py-10 sm:px-10 lg:items-center lg:py-16">
          <div className="w-full max-w-sm">
            <h2 className="text-h1">Sign in</h2>
            <p className="mb-8 mt-1.5 text-[0.9375rem] text-muted">For community health volunteers and health administrators.</p>
            <LoginForm />
          </div>
        </section>
      </main>
    </>
  );
}
