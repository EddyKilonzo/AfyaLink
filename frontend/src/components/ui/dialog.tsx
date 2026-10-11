"use client";

import { AlertTriangle } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";
import { cx } from "./cx";

/**
 * Modal built on the native <dialog>: focus trapping, Esc to close, inert
 * background and the top layer come from the browser.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "sm",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md";
}) {
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
        // Click on the backdrop (the dialog element itself) closes it.
        if (e.target === ref.current) onClose();
      }}
      aria-labelledby="dialog-title"
      className={cx(
        "m-auto w-[calc(100%-2rem)] rounded-[var(--radius-2xl)] bg-surface p-0 text-ink shadow-[var(--shadow-xl)]",
        "backdrop:bg-brand-950/40 backdrop:backdrop-blur-[2px]",
        "open:animate-[dialog-in_220ms_var(--ease-out)] max-sm:mb-3 max-sm:mt-auto",
        size === "sm" ? "max-w-md" : "max-w-xl",
      )}
    >
      <div className="p-6">
        <h2 id="dialog-title" className="text-h3 text-ink">
          {title}
        </h2>
        {description && <div className="mt-2 text-sm leading-relaxed text-muted">{description}</div>}
        {children && <div className="mt-4">{children}</div>}
      </div>
      {footer && <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas/60 px-6 py-4 sm:flex-row sm:justify-end">{footer}</div>}
    </dialog>
  );
}

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Promise-based confirmation, replacing window.confirm with an accessible dialog. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        setState({ ...options, resolve });
      }),
    [],
  );

  function settle(ok: boolean) {
    state?.resolve(ok);
    setState(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={state !== null}
        onClose={() => settle(false)}
        title={state?.title ?? ""}
        description={
          state?.description && (
            <span className="flex gap-3">
              {state.tone === "danger" && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" aria-hidden />}
              <span>{state.description}</span>
            </span>
          )
        }
        footer={
          <>
            <Button variant="outline" onClick={() => settle(false)}>
              {state?.cancelLabel ?? "Cancel"}
            </Button>
            <Button variant={state?.tone === "danger" ? "danger" : "primary"} onClick={() => settle(true)} autoFocus>
              {state?.confirmLabel}
            </Button>
          </>
        }
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  return ctx;
}
