"use client";

import { useEffect } from "react";

/**
 * Registers /sw.js in production builds. In development the service worker is
 * skipped (and any old registration removed) so hot reload is not served stale files.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => undefined);
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.warn("[AfyaLink] Service worker registration failed.", error));
  }, []);

  return null;
}
