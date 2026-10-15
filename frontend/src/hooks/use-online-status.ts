"use client";

import { useSyncExternalStore } from "react";
import { getReachable, subscribeReachable } from "@/lib/connectivity";

function subscribe(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

/**
 * True when the AfyaLink API can actually be reached. Combines the browser's
 * network flag (instant when the interface drops) with the shared reachability
 * store in `lib/connectivity.ts`, which senses dead networks and server
 * recovery automatically. Assumes online until the first check completes.
 */
export function useOnlineStatus(): boolean {
  const browserOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const reachable = useSyncExternalStore(subscribeReachable, getReachable, () => null);
  return browserOnline && reachable !== false;
}

/** Only the browser's `navigator.onLine` flag, without the reachability check. */
export function useBrowserOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
