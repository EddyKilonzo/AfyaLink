"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/toast";

/**
 * Shows a small banner when a new service worker is waiting and asks the user
 * to reload. Lives inside <ToastProvider> so it can present as a toast.
 */
export function SwUpdatePrompt() {
  const toast = useToast();
  const shown = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let reg: ServiceWorkerRegistration | null = null;

    function onStateChange() {
      const sw = reg?.installing ?? reg?.active;
      if (!sw) return;
      if (sw.state === "installed" && navigator.serviceWorker.controller) {
        if (shown.current) return;
        shown.current = true;
        toast.info("Update available", "A new version of AfyaLink is ready.", {
          duration: 0,
          action: {
            label: "Reload now",
            onClick: () => {
              sw.addEventListener("statechange", () => {
                if (sw.state === "activated") window.location.reload();
              });
              reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
            },
          },
        });
      }
    }

    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r) return;
      reg = r;
      r.addEventListener("updatefound", () => {
        const sw = r.installing;
        sw?.addEventListener("statechange", onStateChange);
      });
      onStateChange();
    });
  }, [toast]);

  return null;
}