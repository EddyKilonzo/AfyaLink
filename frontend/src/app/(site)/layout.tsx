import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";

/** Public pages share the site footer; nav lives in the hero so it animates with the dark section. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
