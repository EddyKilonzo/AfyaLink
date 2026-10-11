import type { MetadataRoute } from "next";

// PNGs satisfy installability checks on every platform; the SVGs scale crisply where supported.
// Regenerate the PNGs with `node scripts/generate-icons.mjs` if the SVG mark changes.
const SHORTCUT_ICON = [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }];

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AfyaLink — Community Health Reporting",
    short_name: "AfyaLink",
    description: "From Community Reports to Faster Health Action. Offline-first health reporting for CHVs.",
    id: "/",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f7f9f7",
    theme_color: "#0b3d35",
    categories: ["health", "medical", "productivity"],
    shortcuts: [
      { name: "New health report", short_name: "New report", url: "/reports/new", icons: SHORTCUT_ICON },
      { name: "Sync & offline", short_name: "Sync", url: "/sync", icons: SHORTCUT_ICON },
    ],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
