"use client";

import { CheckCircle2, CircleAlert, Info, X, Loader2 } from "lucide-react";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { createContext, useContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { EASE_OUT, EASE_EMPHASIZE } from "@/components/motion";
import { cx } from "./cx";

export type ToastTone = "success" | "error" | "info" | "loading";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
  duration: number | null;
  action?: ToastAction;
  dismissible?: boolean;
  showProgress?: boolean;
}

export type ToastInput = Omit<Toast, "id" | "duration"> & { duration?: number | null };

export interface ToastApi {
  show: (toast: ToastInput) => number;
  success: (title: string, description?: string, options?: Partial<ToastInput>) => number;
  error: (title: string, description?: string, options?: Partial<ToastInput>) => number;
  info: (title: string, description?: string, options?: Partial<ToastInput>) => number;
  loading: (title: string, description?: string, options?: Partial<ToastInput>) => number;
  dismiss: (id: number) => void;
  dismissAll: () => void;
  update: (id: number, updates: Partial<Toast>) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const DEFAULT_DURATION: Record<ToastTone, number | null> = { 
  success: 4500, 
  info: 5500, 
  error: 9000,
  loading: null,
};

const ICONS: Record<ToastTone, typeof Info> = { 
  success: CheckCircle2, 
  error: CircleAlert, 
  info: Info,
  loading: Loader2,
};

const STYLE: Record<ToastTone, { icon: string; bar: string; bg: string }> = {
  success: { 
    icon: "bg-synced-bg text-synced", 
    bar: "bg-success",
    bg: "bg-surface/95",
  },
  error: { 
    icon: "bg-failed-bg text-failed", 
    bar: "bg-error",
    bg: "bg-surface/95",
  },
  info: { 
    icon: "bg-syncing-bg text-syncing", 
    bar: "bg-syncing",
    bg: "bg-surface/95",
  },
  loading: { 
    icon: "bg-brand-50 text-brand-600", 
    bar: "bg-brand-600",
    bg: "bg-surface/95",
  },
};

const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => 
    setToasts((list) => list.filter((t) => t.id !== id)), 
  []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const update = useCallback((id: number, updates: Partial<Toast>) => 
    setToasts((list) => list.map((t) => t.id === id ? { ...t, ...updates } : t)), 
  []);

  const show = useCallback((input: ToastInput) => {
    const id = nextId.current++;
    const duration = input.duration === undefined ? DEFAULT_DURATION[input.tone] : input.duration;
    const newToast = { ...input, id, duration };
    setToasts((list) => [...list, newToast].slice(-MAX_VISIBLE));
    return id;
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      dismiss,
      dismissAll,
      update,
      success: (title, description, options) => show({ tone: "success", title, description, ...options }),
      error: (title, description, options) => show({ tone: "error", title, description, ...options }),
      info: (title, description, options) => show({ tone: "info", title, description, ...options }),
      loading: (title, description, options) => show({ tone: "loading", title, description, dismissible: false, ...options }),
    }),
    [show, dismiss, dismissAll, update],
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
  const [progress, setProgress] = useState(0);
  const startTimeRef = useRef<number>(0);
  const animationRef = useRef<number | null>(null);
  const durationRef = useRef(toast.duration ?? 0);
  const paused = held || pageHidden;
  const isLoading = toast.tone === "loading";
  
  const close = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);

  // Initialize start time on mount
  useEffect(() => {
    startTimeRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (isLoading || toast.duration === null || !toast.showProgress) return;
    
    const duration = toast.duration ?? 0;
    durationRef.current = duration;
    startTimeRef.current = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);
      
      if (newProgress < 100 && !paused) {
        animationRef.current = requestAnimationFrame(animate);
      } else if (newProgress >= 100) {
        close();
      }
    };

    if (!paused) {
      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [toast.duration, toast.showProgress, isLoading, paused, close]);

  useEffect(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (!isLoading && toast.duration !== null && toast.showProgress !== false && !paused) {
      animationRef.current = requestAnimationFrame(() => {});
    }
  }, [paused, isLoading, toast.duration, toast.showProgress]);

  function onDragEnd(_: unknown, info: PanInfo) {
    if (Math.abs(info.offset.x) > 80 || Math.abs(info.velocity.x) > 500) close();
  }

  const showProgressBar = toast.showProgress !== false && (toast.duration !== null || isLoading);
  const progressScale = isLoading ? 1 : progress / 100;
  const progressDuration = isLoading ? 1 : ((toast.duration ?? 1000) / 1000);

  return (
    <motion.div
      layout
      role={toast.tone === "error" ? "alert" : "status"}
      aria-atomic="true"
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      initial={{ opacity: 0, y: 24, scale: 0.96, x: 20 }}
      animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, scale: 0.96, transition: { duration: 0.18, ease: EASE_OUT } }}
      transition={{ duration: 0.34, ease: EASE_EMPHASIZE }}
      drag={toast.dismissible !== false ? "x" : false}
      dragSnapToOrigin
      dragElastic={0.6}
      onDragEnd={onDragEnd}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
      className="pointer-events-auto relative w-full max-w-sm cursor-grab touch-pan-y overflow-hidden rounded-2xl shadow-[var(--shadow-ring),var(--shadow-xl)] backdrop-blur-xl active:cursor-grabbing sm:max-w-none"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      <div className="flex items-start gap-3 p-3.5 pr-2.5">
        <motion.span
          initial={{ scale: 0.6, rotate: isLoading ? 0 : -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: isLoading ? 0.2 : 0.4, ease: EASE_EMPHASIZE, delay: 0.05 }}
          className={cx("grid size-9 shrink-0 place-items-center rounded-xl", style.icon, isLoading && "animate-spin")}
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
                if (toast.dismissible !== false) close();
              }}
              className="mt-2 rounded-lg text-[0.8125rem] font-semibold text-brand-700 underline-offset-4 hover:underline"
            >
              {toast.action.label}
            </button>
          )}
        </div>
        {toast.dismissible !== false && (
          <button
            type="button"
            onClick={close}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
            aria-label="Dismiss notification"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>

      {showProgressBar && (
        <div className="absolute inset-x-0 bottom-0 h-[3px] bg-sunken" aria-hidden>
          <motion.div
            className={cx("h-full origin-left rounded-r-lg", style.bar)}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: progressScale }}
            transition={{ 
              duration: progressDuration, 
              ease: "linear",
            }}
            style={{ 
              transformOrigin: "left",
              willChange: "transform",
            }}
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

export function ToastContainer() {
  return <div className="fixed inset-0 z-[55] pointer-events-none" aria-hidden="true" />;
}