"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { useSyncExternalStore } from "react";

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

interface UseOnlineStatusOptions {
  checkInterval?: number;
  endpoint?: string;
  timeout?: number;
}

/**
 * Browser connectivity as reported by `navigator.onLine`. This only reflects
 * the network interface, so callers must still treat failed requests as offline.
 * 
 * Enhanced with actual server reachability check for more accurate online status.
 */
export function useOnlineStatus(options?: UseOnlineStatusOptions): boolean {
  const [serverOnline, setServerOnline] = useState<true | false | null>(null); // null = not checked yet
  const checkRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isCheckingRef = useRef(false);
  const consecutiveFailuresRef = useRef(0);

  // Use browser's navigator.onLine as base
  const browserOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Memoize options to avoid effect re-runs
  const memoizedOptions = useMemo(() => ({
    checkInterval: options?.checkInterval ?? 30000,
    endpoint: options?.endpoint ?? "/api/health",
    timeout: options?.timeout ?? 5000,
  }), [options?.checkInterval, options?.endpoint, options?.timeout]);

  // Periodic server connectivity check
  useEffect(() => {
    const { checkInterval, endpoint, timeout } = memoizedOptions;

    const checkConnectivity = async () => {
      if (isCheckingRef.current) return;
      isCheckingRef.current = true;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const response = await fetch(endpoint, { 
          method: "HEAD",
          cache: "no-cache",
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        if (response.ok) {
          setServerOnline(true);
          consecutiveFailuresRef.current = 0;
        } else {
          consecutiveFailuresRef.current += 1;
          // Only mark offline after 2 consecutive failures to avoid flapping
          if (consecutiveFailuresRef.current >= 2) {
            setServerOnline(false);
          }
        }
      } catch {
        consecutiveFailuresRef.current += 1;
        if (consecutiveFailuresRef.current >= 2) {
          setServerOnline(false);
        }
      } finally {
        isCheckingRef.current = false;
      }
    };

    // Initial check - use setTimeout to avoid synchronous setState in effect
    if (browserOnline) {
      setTimeout(() => checkConnectivity(), 0);
    } else {
      setTimeout(() => setServerOnline(false), 0);
    }

    // Periodic checks only when browser says online
    if (browserOnline) {
      checkRef.current = setInterval(checkConnectivity, checkInterval);
    }

    return () => {
      if (checkRef.current) clearInterval(checkRef.current);
    };
  }, [browserOnline, memoizedOptions]);

  // If browser says offline, we're definitely offline
  // If browser says online but server check hasn't run yet, assume online
  // If browser says online but server check fails (after 2 failures), we're offline
  if (!browserOnline) return false;
  if (serverOnline === null) return true; // Not checked yet, assume online
  return serverOnline;
}

/**
 * Simpler version that only uses navigator.onLine (for backwards compatibility)
 */
export function useBrowserOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}