"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAuth } from "@/features/auth/auth-context";
import { cx } from "@/components/ui/cx";

const SHORTCUTS = [
  { keys: ["n"], description: "Record a new health report", section: "Navigation" },
  { keys: ["s"], description: "Go to Sync & offline queue", section: "Navigation" },
  { keys: ["m"], description: "Open the disease map", section: "Navigation" },
  { keys: ["g", "d"], description: "Go to dashboard", section: "Navigation" },
  { keys: ["g", "r"], description: "Go to reports list", section: "Navigation" },
  { keys: ["g", "s"], description: "Go to settings", section: "Navigation" },
  { keys: ["escape"], description: "Close menus and dialogs", section: "Navigation" },
  { keys: ["?"], description: "Show this help page", section: "Navigation" },
  { keys: ["tab"], description: "Move between interactive elements", section: "Accessibility" },
];

export default function HelpPage() {
  const { user } = useAuth();
  const router = useRouter();
  useKeyboardShortcuts([
    { keys: ["?"], description: "Show this help page", action: () => {} },
    { keys: ["escape"], description: "Go back to dashboard", action: () => router.push("/dashboard") },
  ]);

  if (!user) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: "easeOut" }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">Help</p>
        <h1 className="mt-1 text-2xl font-bold text-ink">Keyboard shortcuts</h1>
        <p className="mt-1 text-sm text-muted">AfyaLink keeps your hands on the keyboard when you are out in the field.</p>
      </motion.div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_1px_2px_-1px_rgb(11_61_53/0.06)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-sunken/60 text-left text-xs font-semibold uppercase tracking-wider text-muted">
              <th className="px-4 py-3">Section</th>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((s, i) => (
              <tr key={i} className={cx("border-t border-line", i % 2 ? "bg-sunken/20" : "bg-surface")}>
                <td className="px-4 py-3 text-muted">{s.section}</td>
                <td className="px-4 py-3">
                  <kbd className="inline-flex items-center gap-1 rounded-md bg-sunken px-2 py-1 font-mono text-xs font-semibold text-ink ring-1 ring-inset ring-line">
                    {s.keys.join(" + ")}
                  </kbd>
                </td>
                <td className="px-4 py-3 text-ink">{s.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_-1px_rgb(11_61_53/0.06)]">
        <h2 className="text-sm font-semibold text-ink">Tips for the field</h2>
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted">
          <li>Reports are saved to your phone first. They sync when you come back online.</li>
          <li>Press <kbd className="rounded-md bg-sunken px-1 font-mono text-xs ring-1 ring-inset ring-line">S</kbd> to jump straight to the sync queue.</li>
          <li>Use <kbd className="rounded-md bg-sunken px-1 font-mono text-xs ring-1 ring-inset ring-line">N</kbd> to open a new report without taking your hands off the keyboard.</li>
        </ul>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Need more? <Link href="/settings" className="font-semibold text-brand-600 hover:underline">Settings</Link> covers account and notification preferences.
      </p>
    </div>
  );
}