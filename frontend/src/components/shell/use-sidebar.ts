"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

const STORAGE_KEY = "afyalink:sidebar";
const DESKTOP = "(min-width: 1024px)";

function subscribe(callback: () => void): () => void {
  const query = window.matchMedia(DESKTOP);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

/**
 * Sidebar collapsed/expanded. Defaults: expanded on desktop, a compact rail on
 * tablets. The person's own choice is remembered on this device (a per-viewer
 * convenience only, so storage failures are ignored).
 */
export function useSidebarCollapsed(): { collapsed: boolean; toggle: () => void } {
  const isDesktop = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP).matches,
    () => true,
  );
  const [preference, setPreference] = useState<"collapsed" | "expanded" | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore a saved preference after mount
      if (saved === "collapsed" || saved === "expanded") setPreference(saved);
    } catch {
      // Storage unavailable (private mode, blocked): use the default.
    }
  }, []);

  const collapsed = preference ? preference === "collapsed" : !isDesktop;

  const toggle = useCallback(() => {
    const next = collapsed ? "expanded" : "collapsed";
    setPreference(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Not persisted; still works for this visit.
    }
  }, [collapsed]);

  return { collapsed, toggle };
}
