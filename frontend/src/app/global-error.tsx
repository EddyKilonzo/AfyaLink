"use client";

/**
 * Global error boundary.
 *
 * Deliberately zero-dependency: no UI components, no hooks, no providers,
 * no next/link. Next prerenders this boundary during the static build, and
 * anything that reaches for a React context (router, motion, etc.) throws
 * "Cannot read properties of null (reading 'useContext')" when that context
 * is not yet mounted. A bare <html> with inline styles sidesteps that.
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
          <a href="/" style={{ display: "inline-flex", marginBottom: 24 }} aria-label="AfyaLink home">
            <span style={{ width: 32, height: 32, borderRadius: 9, background: "#0b3d35", display: "inline-block" }} />
          </a>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 1px 3px rgb(0 0 0 / 0.08)" }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: "#0f2a26", marginBottom: 8 }}>AfyaLink could not load</h1>
            <p style={{ fontSize: 14, color: "#6b7280", marginBottom: 16 }}>The application failed to initialize. Your reports saved on this device are safe.</p>
            {error.digest && (
              <p style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, color: "#9ca3af", marginBottom: 16 }}>Ref {error.digest}</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                type="button"
                onClick={() => retry()}
                style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "#0e6a59", color: "#fff", fontWeight: 600, cursor: "pointer" }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontWeight: 600, cursor: "pointer" }}
              >
                Reload page
              </button>
            </div>
          </div>
        </main>
      </body>
    </html>
  );
}