"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";

/**
 * Bottom sheet on phones, centred panel from `sm` up. Native <dialog> gives
 * focus trapping, Esc and an inert background.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className={cx(
        "m-0 mt-auto w-full max-w-none rounded-t-[var(--radius-2xl)] bg-surface p-0 text-ink shadow-[var(--shadow-xl)]",
        "pb-[env(safe-area-inset-bottom)] open:animate-[sheet-in_280ms_var(--ease-out)]",
        "sm:m-auto sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-[var(--radius-2xl)] sm:open:animate-[dialog-in_220ms_var(--ease-out)]",
        "backdrop:bg-brand-950/40 backdrop:backdrop-blur-[2px]",
      )}
    >
      <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line-strong sm:hidden" aria-hidden />
      <div className="flex items-center justify-between px-5 pb-2 pt-3">
        <h2 className="text-h3">{title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-sunken hover:text-ink"
          aria-label="Close"
        >
          <X className="size-[18px]" aria-hidden />
        </button>
      </div>
      <div className="px-3 pb-4">{children}</div>
    </dialog>
  );
}
