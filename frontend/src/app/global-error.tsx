"use client";

// Replaces the root layout when it fails, so it cannot rely on globals.css or fonts.
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f6f5f1", color: "#13221f", margin: 0 }}>
        <title>AfyaLink — error</title>
        <main style={{ maxWidth: 420, margin: "20vh auto", padding: 16, textAlign: "center" }}>
          <h1 style={{ fontSize: 24 }}>AfyaLink could not load</h1>
          <p style={{ color: "#5b6b67" }}>Reports saved on this device are safe.</p>
          {error.digest && <p style={{ fontFamily: "monospace", fontSize: 12 }}>Ref {error.digest}</p>}
          <button
            onClick={() => retry()}
            style={{ marginTop: 12, padding: "10px 16px", borderRadius: 8, border: 0, background: "#0e6a59", color: "#fff", fontWeight: 600 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
