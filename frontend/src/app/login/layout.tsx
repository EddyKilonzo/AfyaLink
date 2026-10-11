import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";

/** Sign-in shares the compact footer; the marketing pages use the full one. */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter variant="compact" />
    </>
  );
}