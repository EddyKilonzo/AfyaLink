/**
 * Animated "signal wave" — concentric rings expanding from a phone to a
 * server tower, drawn as pure SVG with CSS keyframe loops. No JavaScript
 * timing: reduced-motion users see a static frame.
 */
import { useId } from "react";
import { cx } from "@/components/ui/cx";
import { C } from "./frame";

export function SignalWave({ className }: { className?: string }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      aria-hidden
      className={cx("block h-auto w-full max-w-xs", className)}
    >
      <defs>
        <radialGradient id={`${id}-phone`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.b100} />
          <stop offset="100%" stopColor={C.b300} />
        </radialGradient>
        <radialGradient id={`${id}-tower`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={C.amberSoft} />
          <stop offset="100%" stopColor={C.amber} />
        </radialGradient>
      </defs>

      {/* expanding rings */}
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx="40"
          cy="160"
          r="8"
          fill="none"
          stroke={C.b500}
          strokeWidth="2"
          className="signal-ring"
          style={{ animationDelay: `${i * 1.4}s`, transformOrigin: "40px 160px" }}
        />
      ))}

      {/* phone */}
      <g transform="translate(20 140)">
        <rect x="0" y="0" width="40" height="60" rx="8" fill={C.b950} />
        <rect x="4" y="4" width="32" height="44" rx="5" fill={`url(#${id}-phone)`} />
        <circle cx="20" cy="52" r="4" fill={C.b500} />
      </g>

      {/* server tower */}
      <g transform="translate(140 110)">
        <rect x="0" y="0" width="44" height="70" rx="6" fill={C.b900} />
        <rect x="6" y="8" width="32" height="14" rx="3" fill={C.b600} />
        <rect x="6" y="28" width="32" height="14" rx="3" fill={C.b600} />
        <rect x="6" y="48" width="32" height="14" rx="3" fill={C.amber} />
        <circle cx="36" cy="15" r="3" fill={C.amber} className="signal-dot" style={{ animationDelay: "0.4s" }} />
        <circle cx="36" cy="35" r="3" fill={C.amber} className="signal-dot" style={{ animationDelay: "1.1s" }} />
        <circle cx="36" cy="55" r="3" fill={C.amber} className="signal-dot" style={{ animationDelay: "1.8s" }} />
      </g>

      <style>{`
        .signal-ring {
          animation: signal-ring 2.8s var(--ease-out) infinite;
          transform-box: fill-box;
          transform-origin: 40px 160px;
        }
        @keyframes signal-ring {
          0% { r: 8; opacity: 0.9; }
          100% { r: 72; opacity: 0; }
        }
        .signal-dot {
          animation: signal-dot 1.6s ease-in-out infinite;
          transform-box: fill-box;
        }
        @keyframes signal-dot {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .signal-ring, .signal-dot { animation: none; }
        }
      `}</style>
    </svg>
  );
}

/** A row of animated status pills that cycle through sync states. */
export function SyncStatusStrip({ className }: { className?: string }) {
  const states = [
    { label: "Saved on device", tone: "bg-amber-soft text-amber-ink ring-amber/40", Icon: "clock" },
    { label: "Syncing", tone: "bg-syncing-bg text-syncing ring-syncing/15", Icon: "refresh" },
    { label: "Received by server", tone: "bg-synced-bg text-synced ring-synced/15", Icon: "check" },
  ];
  return (
    <div className={cx("flex flex-wrap items-center gap-2", className)}>
      {states.map((s, i) => (
        <span
          key={s.label}
          className={cx(
            "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset transition-all duration-500",
            s.tone,
          )}
          style={{ animation: `fade-up 0.6s var(--ease-out) ${i * 0.2}s both` }}
        >
          <span className="size-2 rounded-full bg-current" aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  );
}