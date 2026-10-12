"use client";

import { useEffect } from "react";

/**
 * Ask the browser to keep IndexedDB around. Browsers may evict storage under
 * pressure (the sync queue lives in Dexie/IndexedDB), and `persist()` is the
 * only signal that asks them not to. Best effort: ignored where unsupported.
 */
export function usePersistentStorage() {
  useEffect(() => {
    const storage = (navigator as Navigator & { storage?: StorageManager }).storage;
    if (!storage?.persist) return;
    let cancelled = false;
    storage
      .persist()
      .then((granted) => {
        if (cancelled) return;
        if (granted) console.info("[AfyaLink] IndexedDB persistence granted.");
      })
      .catch((error) => console.warn("[AfyaLink] Could not request persistent storage.", error));
    return () => {
      cancelled = true;
    };
  }, []);
}