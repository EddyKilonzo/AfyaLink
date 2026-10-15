"use client";

import { Button, Panel, PanelHeader } from "@/components/ui";
import { Logo } from "@/components/brand/logo";

/**
 * Global error boundary. Deliberately dependency-free:
 *  - no `next/link` (the router context is null here, so Link throws
 *    "Cannot read properties of null (reading 'useContext')" during prerender);
 *  - no providers, no hooks, so it can render even when the app itself failed.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>AfyaLink — error</title>
      </head>
      <body>
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: 16, textAlign: "center" }}>
          <a href="/" className="relative inline-flex mb-6" aria-label="AfyaLink home">
            <Logo />
          </a>
          <Panel>
            <PanelHeader title="AfyaLink could not load" description="The application failed to initialize. Your reports saved on this device are safe." />
            <div className="px-5 pb-5 pt-4 sm:px-6">
              {error.digest && (
                <p className="mb-4 font-mono text-xs text-muted text-center">Ref {error.digest}</p>
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Button onClick={() => retry()} className="w-full" style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "#0e6a59", color: "#fff", fontWeight: 600 }}>
                  Try again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()} className="w-full" style={{ padding: "10px 16px", borderRadius: 8 }}>
                  Reload page
                </Button>
              </div>
            </div>
          </Panel>
        </main>
      </body>
    </html>
  );
}