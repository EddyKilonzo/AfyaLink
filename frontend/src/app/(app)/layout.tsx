import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { Spinner } from "@/components/ui";

/**
 * Every route in this group needs a signed-in user (any role). The shell reads
 * the URL and the session at runtime, so it streams in behind a Suspense
 * boundary (required by Cache Components for dynamic routes such as /reports/[id]).
 *
 * The session cookie belongs to the API origin, so the Next server cannot see
 * it: these pages render only after the browser confirms the session (or loads
 * the cached offline profile). Nothing here can be part of a prerendered shell,
 * so every page in this group exports `instant = false` (a per-segment
 * setting) to opt out of instant-navigation validation.
 */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Spinner label="Loading AfyaLink" />
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
