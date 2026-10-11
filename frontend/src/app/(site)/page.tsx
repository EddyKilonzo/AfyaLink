import { Hero } from "@/features/landing/hero";
import { OfflineDemo } from "@/features/landing/offline-demo";
import { FAQ, Features, FinalCta, HowItWorks, Impact, Showcase } from "@/features/landing/sections";

export default function Page() {
  return (
    <main id="main" className="overflow-x-clip">
      <Hero />
      <Features />
      <HowItWorks />
      <OfflineDemo />
      <Showcase />
      <Impact />
      <FAQ />
      <FinalCta />
    </main>
  );
}
