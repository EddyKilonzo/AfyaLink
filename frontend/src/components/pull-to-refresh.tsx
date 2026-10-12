"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pull-to-refresh on touch devices. While the user pulls down past a
 * threshold, a spinner shows; releasing triggers `onRefresh`.
 */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: ReactNode }) {
  const startY = useRef(0);
  const pulling = useRef(false);
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = el.current;
    if (!node) return;
    let dy = 0;

    function onTouchStart(e: TouchEvent) {
      // Only start when the page is already scrolled to the top.
      if (window.scrollY > 4) return;
      const t = e.touches[0];
      if (!t) return;
      startY.current = t.clientY;
      pulling.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      dy = t.clientY - startY.current;
      if (dy > 10 && window.scrollY <= 4 && !pulling.current) {
        pulling.current = true;
        node.style.transition = "none";
      }
      if (pulling.current) {
        e.preventDefault();
        const clamped = Math.min(dy, 90);
        node.style.transform = `translateY(${clamped}px)`;
      }
    }

    async function onTouchEnd() {
      if (!pulling.current) return;
      pulling.current = false;
      node.style.transition = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
      if (dy > 72) {
        node.style.transform = "translateY(56px)";
        try {
          await onRefresh();
        } finally {
          node.style.transform = "translateY(0)";
        }
      } else {
        node.style.transform = "translateY(0)";
      }
      dy = 0;
    }

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh]);

  return (
    <div ref={el} className="relative">
      <div
        className="pointer-events-none absolute left-1/2 top-2 z-20 -translate-x-1/2 grid size-9 place-items-center rounded-full bg-surface shadow-[var(--shadow-ring)] transition-opacity duration-200"
        aria-hidden
      >
        <RefreshIcon className="size-4 animate-spin text-muted" />
      </div>
      {children}
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}