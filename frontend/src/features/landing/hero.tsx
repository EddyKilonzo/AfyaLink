import { ArrowRight, WifiOff } from "lucide-react";
import type { CSSProperties } from "react";
import { DrawnBorder } from "@/components/brand/drawn-border";
import { HexTexture } from "@/components/brand/hex-texture";
import { ButtonAnchor, ButtonLink } from "@/components/ui";
import { HeroPreview } from "./hero-preview";
import { SiteNav } from "@/components/site/site-nav";

// CSS-driven entrance: runs as soon as the HTML arrives, with no JavaScript,
// so the headline is never hidden waiting for hydration.
const rise = (step: number): CSSProperties => ({ animationDelay: `${60 + step * 90}ms` });

export function Hero() {
  return (
    <section className="relative w-full">
      <SiteNav overDark />
      <div className="relative overflow-hidden rounded-[28px] bg-brand-950 pb-16 pt-24 shadow-[var(--shadow-sm)] sm:rounded-[36px] sm:pb-24 sm:pt-28 lg:pb-28 lg:pt-32">
      <HexTexture tone="dark" />
      <DrawnBorder radius={36} tone="dark" className="max-sm:hidden" />
      <DrawnBorder radius={28} tone="dark" className="sm:hidden" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <div className="max-w-[40rem] max-lg:mx-auto max-lg:text-center">
          <p
            style={rise(0)}
            className="animate-rise inline-flex items-center gap-2 rounded-full bg-white/10 py-1 pl-1.5 pr-3 text-[0.8125rem] font-semibold text-brand-100 ring-1 ring-inset ring-white/15"
          >
            <span className="grid size-6 place-items-center rounded-full bg-amber text-brand-950">
              <WifiOff className="size-3.5" aria-hidden />
            </span>
            Community health, connected
          </p>

          <h1 style={rise(1)} className="animate-rise text-display mt-6 text-white">
            Better community health starts with every report.
          </h1>

          <p style={rise(2)} className="animate-rise text-lead mt-6 text-brand-100/85 max-lg:mx-auto">
            Empowering community health volunteers to capture, manage, and share vital health reports, even when connectivity is unreliable.
          </p>

          <div style={rise(3)} className="animate-rise mt-9 flex flex-col gap-3 sm:flex-row max-lg:justify-center">
            <ButtonLink href="/login" variant="inverse" size="lg" trailingIcon={<ArrowRight className="size-4 transition-transform duration-[var(--duration-micro)] group-hover:translate-x-0.5" aria-hidden />} className="group">
              Get started
            </ButtonLink>
            <ButtonAnchor href="#platform" variant="ghost" size="lg" className="text-white ring-1 ring-inset ring-white/25 hover:bg-white/10 hover:text-white">
              Explore the platform
            </ButtonAnchor>
          </div>

          <p style={rise(4)} className="animate-rise mt-7 text-sm text-brand-200">
            Designed for community health teams working beyond reliable connectivity.
          </p>
        </div>

        <div style={rise(2)} className="animate-rise [animation-duration:800ms]">
          <HeroPreview />
        </div>
      </div>
      </div>
    </section>
  );
}
