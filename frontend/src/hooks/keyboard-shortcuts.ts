"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

/** `n` = new report, `s` = sync, `?` = help. Ignored when typing in a field. */
export function KeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (typing) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const n = e.key.toLowerCase();
      if (n === "n" && !e.shiftKey) {
        e.preventDefault();
        router.push("/reports/new");
      } else if (n === "s") {
        e.preventDefault();
        router.push("/sync");
      } else if (n === "?") {
        e.preventDefault();
        router.push("/help");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  return null;
}