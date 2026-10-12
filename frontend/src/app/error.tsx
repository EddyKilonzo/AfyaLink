"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, Panel, PanelHeader } from "@/components/ui";
import { Logo } from "@/components/brand/logo";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error("[AfyaLink] Unhandled UI error", error.digest ?? "", error);
  }, [error]);

  return (
    <main id="main" className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 px-4">
      <Link href="/" className="relative inline-flex" aria-label="AfyaLink home">
        <Logo />
      </Link>
      <Panel className="w-full max-w-md">
        <PanelHeader title="Something went wrong" description="An unexpected error occurred. Your reports saved on this device are safe." />
        <div className="px-5 pb-5 pt-4 sm:px-6">
          {error.digest && (
            <p className="mb-4 font-mono text-xs text-muted text-center">Ref {error.digest}</p>
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={() => retry()} className="w-full">
              Try again
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
              Reload page
            </Button>
          </div>
        </div>
      </Panel>
    </main>
  );
}