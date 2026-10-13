import { Hero } from "@/features/landing/hero";
import { OfflineDemo } from "@/features/landing/offline-demo";
import { About, FAQ, Features, FinalCta, HowItWorks, Impact, Showcase, SyncDemo } from "@/features/landing/sections";

export default function Page() {
  return (
    <main id="main" className="overflow-x-clip">
      <Hero />
      <Features />
      <SyncDemo />
      <HowItWorks />
      <OfflineDemo />
      <Showcase />
      <Impact />
      <About />
      <FAQ />
      <FinalCta />
    </main>
  );
}
