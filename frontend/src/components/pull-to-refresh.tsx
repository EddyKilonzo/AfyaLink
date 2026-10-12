"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Pull-to-refresh on touch devices. While the user pulls down past a
 * threshold, a spinner shows; releasing triggers `onRefresh`.
 */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<void> | void; children: ReactNode }) {
  const el = useRef<HTMLDivElement>(null);
  const spinner = useRef<HTMLDivElement>(null);
  const refreshRef = useRef(onRefresh);
  useEffect(() => {
    refreshRef.current = onRefresh;
  });

  useEffect(() => {
    const node = el.current;
    const icon = spinner.current;
    if (!node || !icon) return;
    const spin = icon.classList;
    let startY = 0;
    let dy = 0;
    let pulling = false;
    let busy = false;
    const set = (y: number, animate: boolean) => {
      node.style.transition = icon.style.transition = animate ? "transform 280ms cubic-bezier(0.22, 1, 0.36, 1), opacity 200ms" : "none";
      node.style.transform = y ? `translateY(${y}px)` : "";
      icon.style.opacity = String(Math.min(y / 56, 1));
      icon.style.transform = `translateX(-50%) rotate(${y * 4}deg)`;
    };

    function onTouchStart(e: TouchEvent) {
      if (busy || window.scrollY > 4) return;
      startY = e.touches[0]?.clientY ?? 0;
      pulling = false;
    }
    function onTouchMove(e: TouchEvent) {
      if (busy || !startY) return;
      dy = (e.touches[0]?.clientY ?? startY) - startY;
      if (dy > 10 && window.scrollY <= 4) pulling = true;
      if (pulling) {
        e.preventDefault();
        set(Math.min(dy * 0.6, 90), false);
      }
    }
    async function onTouchEnd() {
      startY = 0;
      if (!pulling) return;
      pulling = false;
      if (dy * 0.6 < 56) return set(0, true);
      busy = true;
      set(56, true);
      spin.add("animate-spin");
      try {
        await refreshRef.current();
      } finally {
        spin.remove("animate-spin");
        set(0, true);
        busy = false;
      }
    }

    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);
    return () => {
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  return (
    <div ref={el} className="relative">
      <div
        ref={spinner}
        className="pointer-events-none absolute -top-12 left-1/2 z-20 grid size-9 -translate-x-1/2 place-items-center rounded-full bg-surface text-brand-700 opacity-0 shadow-[var(--shadow-ring)]"
        aria-hidden
      >
        <RefreshCw className="size-4" />
      </div>
      {children}
    </div>
  );
}
