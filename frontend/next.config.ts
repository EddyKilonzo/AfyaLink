import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";

/**
 * Allow a single root .env for the whole repo: copy only NEXT_PUBLIC_* keys
 * from ../.env so server secrets (DB, session) never enter the frontend process.
 * frontend/.env.local still takes precedence (Next loads it itself).
 */
function loadPublicEnvFromRoot(): void {
  const file = path.resolve(process.cwd(), "..", ".env");
  if (!existsSync(file)) return;
  try {
    const parsed = parseEnv(readFileSync(file, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith("NEXT_PUBLIC_") && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    console.warn("[AfyaLink] Could not read ../.env:", error instanceof Error ? error.message : error);
  }
}
loadPublicEnvFromRoot();

const isDev = process.env.NODE_ENV !== "production";
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";
let apiOrigin = "http://localhost:3001";
try {
  apiOrigin = new URL(apiUrl).origin;
} catch {
  console.warn(`[AfyaLink] NEXT_PUBLIC_API_URL "${apiUrl}" is not a valid URL; using ${apiOrigin}.`);
}

// Next.js injects inline bootstrap scripts, so 'unsafe-inline' is needed for
// scripts unless nonce-based CSP (dynamic rendering via proxy.ts) is adopted.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.tile.openstreetmap.org",
  "font-src 'self'",
  `connect-src 'self' ${apiOrigin}${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  "worker-src 'self'",
  "manifest-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // The service worker must always be revalidated so updates roll out.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
