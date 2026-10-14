"use client";

import { useEffect, type DependencyList } from "react";

interface ShortcutConfig {
  keys: string[];
  description: string;
  action: () => void;
  scope?: "global" | "input";
}

/**
 * Register keyboard shortcuts. `keys` is matched against the user's key
 * combination (case-insensitive, order-independent). Shortcuts are ignored
 * while typing in text inputs, textareas, or contenteditable elements unless
 * `scope: "input"` is set.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], deps: DependencyList = []) {
  useEffect(() => {
    function isTyping(el: Element | null): boolean {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      const isEditable = el.getAttribute("contenteditable") === "true";
      return tag === "input" || tag === "textarea" || tag === "select" || isEditable;
    }

    function handler(e: KeyboardEvent) {
      if (isTyping(document.activeElement)) {
        const allow = shortcuts.find((s) => s.scope === "input");
        if (!allow) return;
      }

      const combo = [e.ctrlKey ? "ctrl" : "", e.shiftKey ? "shift" : "", e.altKey ? "alt" : "", e.metaKey ? "meta" : "", e.key.toLowerCase()]
        .filter(Boolean)
        .sort()
        .join("+");

      const match = shortcuts.find((s) => s.keys.map((k) => k.toLowerCase()).sort().join("+") === combo);
      if (match) {
        e.preventDefault();
        match.action();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shortcuts, ...deps]);
}