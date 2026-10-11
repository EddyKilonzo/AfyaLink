"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

// Route-level error boundary. Never renders error.message: it may hold details not meant for users.
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[AfyaLink] Unhandled UI error", error.digest ?? "", error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted">Reports saved on this device are safe. Try again, or reload the page.</p>
      {error.digest && <p className="font-mono text-xs text-muted">Ref {error.digest}</p>}
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
