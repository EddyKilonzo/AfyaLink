/*
 * AfyaLink service worker — deliberately conservative.
 *
 * Caches ONLY same-origin app shell resources so the UI can open offline:
 *   - /_next/static/* (hashed, immutable): cache-first
 *   - page navigations: network-first, falling back to the cached copy
 *   - icons and manifest: precached, then stale-while-revalidate
 *
 * Never cached: anything cross-origin (the API runs on its own origin),
 * any /api/ path, non-GET requests, and responses marked no-store/private.
 * Health data lives in IndexedDB under app control, not in this cache.
 */
const VERSION = "afyalink-v3";
const SHELL_CACHE = `${VERSION}-shell`;
const STATIC_CACHE = `${VERSION}-static`;
const OFFLINE_ROUTE = "/offline";
// Every static app route. Dynamic ones (/reports/:id) fall back to OFFLINE_ROUTE.
const SHELL_ROUTES = [
  "/",
  "/login",
  OFFLINE_ROUTE,
  "/dashboard",
  "/reports",
  "/reports/new",
  "/sync",
  "/maps",
  "/settings",
  "/admin",
  "/admin/reports",
  "/admin/users",
  "/admin/users/new",
  "/admin/locations",
  "/admin/audit",
];
// Install metadata, so the installed app keeps its name and icons offline.
const STATIC_FILES = [
  "/manifest.webmanifest",
  "/icon.svg",
  "/icon-maskable.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-512.png",
];
// Hashed script/style/font URLs referenced by a page's HTML.
const ASSET_PATTERN = /\/_next\/static\/[^"'\s)\\]+/g;

/** Caches a page and the scripts/styles it references, so it can run offline. */
async function precacheRoute(url) {
  const response = await fetch(new Request(url, { credentials: "same-origin" }));
  // A redirected response (e.g. to /login) cannot answer a navigation later; skip it.
  if (!response.ok || response.redirected) return;
  const html = await response.clone().text();
  await (await caches.open(SHELL_CACHE)).put(url, response);
  const assets = [...new Set(html.match(ASSET_PATTERN) || [])];
  const staticCache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(
    assets.map(async (asset) => {
      if (await staticCache.match(asset)) return;
      const res = await fetch(asset);
      if (res.ok) await staticCache.put(asset, res);
    }),
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    // Best effort: one failing route or file must not block installation.
    Promise.allSettled([
      ...SHELL_ROUTES.map(precacheRoute),
      caches.open(STATIC_CACHE).then((cache) => Promise.allSettled(STATIC_FILES.map((file) => cache.add(file)))),
    ]).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function isCacheable(response) {
  if (!response || !response.ok || response.type !== "basic") return false;
  const cacheControl = response.headers.get("Cache-Control") || "";
  return !/no-store|private/i.test(cacheControl);
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (isCacheable(response)) cache.put(request, response.clone()).catch(() => undefined);
    return response;
  } catch {
    const cached = (await cache.match(request, { ignoreSearch: true })) || (await cache.match(OFFLINE_ROUTE));
    if (cached) return cached;
    return new Response("AfyaLink is offline and this page has not been opened before.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheable(response)) cache.put(request, response.clone()).catch(() => undefined);
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (isCacheable(response)) cache.put(request, response.clone()).catch(() => undefined);
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // includes the API origin
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (/\.(svg|png|ico|webmanifest)$/.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
