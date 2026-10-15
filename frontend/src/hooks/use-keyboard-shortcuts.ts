"use client";

import { useEffect, type DependencyList } from "react";

interface ShortcutConfig {
  keys: string[];
  description: string;
  action: () => void;
  /** Where the shortcut is live: "global" outside text fields, "input" while
   *  the focus is in one (useful for e.g. submit-on-enter). Defaults to
   *  ["global"]; pass both to match everywhere. */
  scope?: ("global" | "input")[];
}

/**
 * Register keyboard shortcuts. `keys` is matched against the user's key
 * combination (case-insensitive, order-independent). Shortcuts are ignored
 * while typing in text inputs, textareas, or contenteditable elements unless
 * its `scope` includes `"input"`.
 *
 * Modifiers are normalized across platforms: Ctrl on Windows/Linux and Cmd on
 * macOS both resolve to `"mod"`, so `["mod", "k"]` works on either.
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[], deps: DependencyList = []) {
  useEffect(() => {
    function isTyping(el: Element | null): boolean {
      if (!el) return false;
      const tag = el.tagName.toLowerCase();
      const isEditable = el.getAttribute("contenteditable") === "true";
      return tag === "input" || tag === "textarea" || tag === "select" || isEditable;
    }

    function normalizeCombo(e: KeyboardEvent): string {
      const parts: string[] = [];
      // Cross-platform: Ctrl on Windows/Linux and Cmd on macOS both mean "mod".
      if (e.ctrlKey || e.metaKey) parts.push("mod");
      if (e.shiftKey) parts.push("shift");
      if (e.altKey) parts.push("alt");
      parts.push(e.key.toLowerCase());
      return parts.sort().join("+");
    }

    function normalizeKeys(keys: string[]): string {
      return keys
        .map((k) => k.toLowerCase())
        .map((k) => (k === "cmd" || k === "ctrl" || k === "meta" ? "mod" : k))
        .sort()
        .join("+");
    }

    function handler(e: KeyboardEvent) {
      const where = isTyping(document.activeElement) ? "input" : "global";
      const combo = normalizeCombo(e);
      const match = shortcuts.find((s) => (s.scope ?? ["global"]).includes(where) && normalizeKeys(s.keys) === combo);
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