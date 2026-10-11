"use client";

import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { EASE_OUT } from "@/components/motion";
import { cx } from "./cx";

type ToastTone = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  /** Milliseconds before it leaves on its own; `null` keeps it until dismissed. */
  duration: number | null;
  action?: ToastAction;
}

type ToastInput = Omit<Toast, "id" | "duration"> & { duration?: number | null };

interface ToastApi {
  show: (toast: ToastInput) => void;
  success: (title: string, description?: string, options?: Partial<ToastInput>) => void;
  error: (title: string, description?: string, options?: Partial<ToastInput>) => void;
  info: (title: string, description?: string, options?: Partial<ToastInput>) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Errors get longer to read; every timer pauses on hover, focus, or a hidden tab.
const DEFAULT_DURATION: Record<ToastTone, number> = { success: 4500, info: 5500, error: 9000 };
const ICONS: Record<ToastTone, typeof Info> = { success: CheckCircle2, error: CircleAlert, info: Info };
const STYLE: Record<ToastTone, { icon: string; bar: string }> = {
  success: { icon: "bg-synced-bg text-synced", bar: "bg-success" },
  error: { icon: "bg-failed-bg text-failed", bar: "bg-error" },
  info: { icon: "bg-syncing-bg text-syncing", bar: "bg-syncing" },
};
const MAX_VISIBLE = 3;

/**
 * Toasts stack above the phone tab bar (bottom-centre) and in the bottom-right
 * corner on larger screens, so they never cover the main actions.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const show = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    const duration = input.duration === undefined ? DEFAULT_DURATION[input.tone] : input.duration;
    setToasts((list) => [...list, { ...input, id, duration }].slice(-MAX_VISIBLE));
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (title, description, options) => show({ tone: "success", title, description, ...options }),
      error: (title, description, options) => show({ tone: "error", title, description, ...options }),
      info: (title, description, options) => show({ tone: "info", title, description, ...options }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <section
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2.5 sm:inset-x-auto sm:right-5 sm:w-[24rem] sm:items-stretch md:bottom-5"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </section>
    </ToastContext.Provider>
  );
}

function usePageHidden(): boolean {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return hidden;
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const Icon = ICONS[toast.tone];
  const style = STYLE[toast.tone];
  const pageHidden = usePageHidden();
  const [held, setHeld] = useState(false);
  const paused = held || pageHidden;
  const close = () => onDismiss(toast.id);

  function onDragEnd(_: unknown, info: PanInfo) {
    // A firm swipe sideways dismisses (touch screens); a light flick also works.
    if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) close();
  }

  return (
    <motion.div
      layout
      role={toast.tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.18, ease: EASE_OUT } }}
      transition={{ duration: 0.34, ease: EASE_OUT }}
      drag="x"
      dragSnapToOrigin
      dragElastic={0.6}
      onDragEnd={onDragEnd}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="pointer-events-auto relative w-full max-w-sm cursor-grab touch-pan-y overflow-hidden rounded-2xl bg-surface/95 shadow-[var(--shadow-ring),var(--shadow-lg)] backdrop-blur-xl active:cursor-grabbing sm:max-w-none"
    >
      <div className="flex items-start gap-3 p-3.5 pr-2.5">
        <motion.span
          initial={{ scale: 0.6, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.05 }}
          className={cx("grid size-9 shrink-0 place-items-center rounded-xl", style.icon)}
        >
          <Icon className="size-[18px]" aria-hidden />
        </motion.span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-ink">{toast.title}</p>
          {toast.description && <p className="mt-0.5 text-[0.8125rem] leading-snug text-muted">{toast.description}</p>}
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                close();
              }}
              className="mt-2 rounded-lg text-[0.8125rem] font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
          aria-label="Dismiss notification"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      {toast.duration !== null && (
        // The bar is the timer: its animation ending is what dismisses the toast,
        // so what you see and when it closes can never drift apart.
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-sunken" aria-hidden>
          <div
            className={cx("toast-timer h-full origin-left", style.bar)}
            style={{ "--toast-duration": `${toast.duration}ms`, animationPlayState: paused ? "paused" : "running" } as CSSProperties}
            onAnimationEnd={close}
          />
        </div>
      )}
    </motion.div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>.");
  return ctx;
}
