"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/motion";
import { SiteFooter } from "@/components/site/site-footer";

/** Public pages share the site footer; nav lives in the hero so it animates with the dark section. */
export default function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <>
      <PageTransition routeKey={pathname}>{children}</PageTransition>
      <SiteFooter />
    </>
  );
}