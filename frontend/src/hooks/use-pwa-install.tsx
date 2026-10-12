"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui";

/**
 * The browser's deferred-install prompt. Browsers fire `beforeinstallprompt`
 * when the app is installable; the event is held until the user acts, then
 * consumed. iOS Safari has no programmatic path, so it reports `unsupported`.
 *
 * We keep the event on the window rather than in state so it survives re-renders,
 * and expose a stable `prompt()` that returns whether the user accepted.
 */
export type PwaInstallStatus = "idle" | "unsupported" | "available" | "declined" | "installed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

function setDeferred(ev: BeforeInstallPromptEvent | null) {
  deferred = ev;
  notify();
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    setDeferred(e as BeforeInstallPromptEvent);
  });
  window.addEventListener("appinstalled", () => setDeferred(null));
}

/**
 * Whether the browser will let us ask the user to install, and a `prompt()`
 * that triggers the native install card. Calling it before the event is
 * available is a no-op (returns false).
 */
export function usePwaInstall() {
  const [, setTick] = useState(0);
  const status: PwaInstallStatus = (() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
    if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
    if (deferred) return "available";
    return "idle";
  })();

  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  async function prompt(): Promise<boolean> {
    const ev = deferred;
    if (!ev) return false;
    try {
      const result = await ev.prompt();
      if (result.outcome === "accepted") setDeferred(null);
      return result.outcome === "accepted";
    } finally {
      // Some browsers keep firing the event; consume it either way.
      setDeferred(null);
    }
  }

  return { status, prompt };
}

/** Install button. Renders only when the browser offers a prompt; otherwise nothing. */
export function InstallButton({
  variant = "ghost",
  size = "sm",
  className,
  children = "Install app",
  afterInstall,
}: {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "inverse";
  size?: "sm" | "md" | "lg";
  className?: string;
  children?: ReactNode;
  afterInstall?: () => void;
}) {
  const { status, prompt } = usePwaInstall();

  if (status !== "available") return null;

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={async () => {
        const ok = await prompt();
        if (ok && afterInstall) afterInstall();
      }}
    >
      {children}
    </Button>
  );
}