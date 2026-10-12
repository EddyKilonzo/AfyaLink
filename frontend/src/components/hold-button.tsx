import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui/cx";

/**
 * A button that requires a deliberate hold before it fires.
 *
 * Press and hold for `holdMs` (default 700) to trigger `onHold`. A tap is a
 * no-op — this is for destructive actions (discard, delete, sign out) so they
 * can't be triggered by an accidental tap. The ring fills as you hold; it
 * cancels if you release early or move too far.
 */
export type HoldTone = "danger" | "brand" | "neutral";

export function HoldButton({
  label,
  onHold,
  holdMs = 700,
  disabled,
  className,
  tone = "danger",
}: {
  label: string;
  onHold: () => void | Promise<void>;
  holdMs?: number;
  disabled?: boolean;
  className?: string;
  tone?: HoldTone;
}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef<number | null>(null);
  const startAt = useRef<number | null>(null);
  const fired = useRef(false);

  function clear() {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    startAt.current = null;
  }

  useEffect(() => clear, []);

  function onDown(e: React.PointerEvent) {
    if (disabled || fired.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startAt.current = performance.now();
    fired.current = false;
    setProgress(0);
    setDone(false);

    const tick = () => {
      if (!startAt.current) return;
      const elapsed = performance.now() - startAt.current;
      const p = Math.min(1, elapsed / holdMs);
      setProgress(p);
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        fired.current = true;
        setDone(true);
        void onHold();
      }
    };
    raf.current = requestAnimationFrame(tick);
  }

  function onUp() {
    clear();
    if (!fired.current) setProgress(0);
  }

  const TONES: Record<HoldTone, { track: string; fill: string; text: string }> = {
    danger: { track: "bg-failed-bg", fill: "bg-failed", text: "text-failed" },
    brand: { track: "bg-brand-100", fill: "bg-brand-600", text: "text-brand-700" },
    neutral: { track: "bg-sunken", fill: "bg-line-strong", text: "text-muted" },
  };
  const tones = TONES[tone];

  return (
    <button
      type="button"
      disabled={disabled || done}
      onPointerDown={onDown}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      aria-label={label}
      aria-live="polite"
      className={cx(
        "relative isolate overflow-hidden rounded-xl px-4 py-3 text-left transition-colors",
        tones.track,
        done ? tones.text : "text-muted",
        disabled && "pointer-events-none opacity-55",
        className,
      )}
    >
      <span className="relative z-10 flex items-center gap-2">
        {done ? (
          <HoldCheck />
        ) : (
          <HoldGrip className={tones.text} />
        )}
        <span className="text-sm font-semibold">
          {done ? "Done" : "Hold to confirm"}
        </span>
      </span>
      <span
        className="absolute inset-y-0 left-0 z-0 w-full origin-left"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden
      >
        <span className={cx("block h-full w-full", tones.fill)} />
      </span>
    </button>
  );
}

function HoldGrip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={cx("size-4", className)} aria-hidden>
      <line x1="4" y1="6" x2="10" y2="6" />
      <line x1="4" y1="12" x2="10" y2="12" />
      <line x1="4" y1="18" x2="10" y2="18" />
      <circle cx="17" cy="7" r="1.4" fill="currentColor" />
      <circle cx="17" cy="12" r="1.4" fill="currentColor" />
      <circle cx="17" cy="17" r="1.4" fill="currentColor" />
    </svg>
  );
}

function HoldCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}