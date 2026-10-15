import { API_URL } from "./config";

/**
 * Whether the AfyaLink API is reachable, shared app-wide. `navigator.onLine`
 * only reflects the network interface (it stays `true` on a dead Wi-Fi or a
 * captive portal), so this is fed by two sources:
 *  - every real API call (`reportReachable` from `lib/api.ts`), which senses a
 *    drop or a recovery the moment a request fails or succeeds; and
 *  - a lightweight probe of `GET {API_URL}/health`, fast while unreachable so
 *    recovery is noticed within seconds, slow while reachable.
 */

const PROBE_TIMEOUT_MS = 5_000;
const PROBE_WHILE_UP_MS = 30_000;
const PROBE_WHILE_DOWN_MS = 5_000;

let reachable: boolean | null = null; // null = not known yet
const listeners = new Set<() => void>();

export function getReachable(): boolean | null {
  return reachable;
}

/** Record what a request just learned about the server. */
export function reportReachable(value: boolean): void {
  if (reachable === value) return;
  reachable = value;
  for (const listener of listeners) listener();
  // State changed: re-arm the probe at the cadence for the new state.
  if (timer !== null) schedule(0);
}

export function subscribeReachable(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) start();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) stop();
  };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let probing = false;

/** Probe the API now. Any HTTP response means the server is reachable. */
export async function probeNow(): Promise<void> {
  if (probing) return;
  if (!navigator.onLine) {
    reportReachable(false);
    return;
  }
  probing = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    await fetch(`${API_URL}/health`, { cache: "no-store", credentials: "omit", signal: controller.signal });
    reportReachable(true);
  } catch {
    reportReachable(false);
  } finally {
    clearTimeout(timeout);
    probing = false;
  }
}

function schedule(delay?: number): void {
  if (timer !== null) clearTimeout(timer);
  const next = delay ?? (reachable === false ? PROBE_WHILE_DOWN_MS : PROBE_WHILE_UP_MS);
  timer = setTimeout(async () => {
    await probeNow();
    if (timer !== null) schedule();
  }, next);
}

function onOnline(): void {
  void probeNow();
}

function onOffline(): void {
  reportReachable(false);
}

function onActive(): void {
  if (document.visibilityState === "visible") void probeNow();
}

function start(): void {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  window.addEventListener("focus", onActive);
  document.addEventListener("visibilitychange", onActive);
  schedule(0);
}

function stop(): void {
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOffline);
  window.removeEventListener("focus", onActive);
  document.removeEventListener("visibilitychange", onActive);
  if (timer !== null) clearTimeout(timer);
  timer = null;
}
