"use client";

import { animate, motion, MotionConfig, useInView, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The AfyaLink motion language. One easing curve and three durations:
 * micro (140ms) for feedback, ui (220ms) for state changes, section
 * (520ms) for entrances, page (420ms) for route transitions. Everything moves
 * with opacity + transform only. These match `--duration-*` in globals.css.
 */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.42, 0, 0.58, 1] as const;
export const EASE_BACK = [0.34, 1.56, 0.64, 1] as const;
export const EASE_EMPHASIZE = [0.16, 1, 0.3, 1] as const;
export const DURATION = { micro: 0.14, ui: 0.22, section: 0.52, page: 0.42 } as const;

export const spring = { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.8 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.section, ease: EASE_OUT } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: DURATION.ui, ease: EASE_OUT } },
};

export const stagger = (step = 0.06, delay = 0): Variants => ({
  hidden: {},
  show: { transition: { staggerChildren: step, delayChildren: delay } },
});

export const listItem: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: DURATION.ui, ease: EASE_BACK } },
};

/**
 * Global motion settings. `reducedMotion="user"` makes every motion component
 * drop transform/layout animation when the OS asks for reduced motion.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: DURATION.ui, ease: EASE_OUT, stiffness: 320, damping: 32 }}
    >
      {children}
    </MotionConfig>
  );
}

/** AOS-style entrance effects (small distances, one curve). */
export type RevealEffect = "fade-up" | "fade-down" | "fade-left" | "fade-right" | "zoom-in" | "fade" | "flip-up";

const EFFECTS: Record<RevealEffect, { opacity: number; x?: number; y?: number; scale?: number; rotateX?: number }> = {
  "fade-up": { opacity: 0, y: 22 },
  "fade-down": { opacity: 0, y: -22 },
  "fade-left": { opacity: 0, x: 28 },
  "fade-right": { opacity: 0, x: -28 },
  "zoom-in": { opacity: 0, scale: 0.92 },
  fade: { opacity: 0 },
  "flip-up": { opacity: 0, y: 20, rotateX: -14 },
};

export function Reveal({
  children,
  className,
  delay = 0,
  as = "div",
  effect = "fade-up",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
  effect?: RevealEffect;
}) {
  const Component = motion[as];
  return (
    <Component
      data-reveal=""
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: false, margin: "0px 0px -10% 0px" }}
      variants={{
        hidden: EFFECTS[effect],
        show: {
          opacity: 1,
          x: 0,
          y: 0,
          scale: 1,
          rotateX: 0,
          transition: { duration: DURATION.section, ease: EASE_OUT, delay, staggerChildren: 0.05 },
        },
      }}
    >
      {children}
    </Component>
  );
}

/** Staggered entrance for a list; children should be `<StaggerItem>`. */
export function Stagger({ children, className, step = 0.05, as = "ul" }: { children: ReactNode; className?: string; step?: number; as?: "ul" | "div" | "ol" }) {
  const Component = motion[as];
  return (
    <Component className={className} initial="hidden" animate="show" variants={stagger(step)}>
      {children}
    </Component>
  );
}

export function StaggerItem({ children, className, as = "li" }: { children: ReactNode; className?: string; as?: "li" | "div" }) {
  const Component = motion[as];
  return (
    <Component className={className} variants={listItem}>
      {children}
    </Component>
  );
}

/** Page-content entrance used by the app shell on every route change. */
export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey: string }) {
  return (
    <motion.div
      key={routeKey}
      initial={{ opacity: 0, y: 10, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: DURATION.page, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Counts up to `value` the first time it becomes available, then simply shows
 * later values (no replay on every refresh). Instant with reduced motion.
 */
export function CountUp({ value, format = (n) => n.toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const played = useRef(false);
  const [display, setDisplay] = useState<number>(0);

  useEffect(() => {
    if (!inView) return;
    if (played.current || reduce || value === 0) {
      played.current = true;
      setDisplay(value);
      return;
    }
    played.current = true;
    const controls = animate(0, value, {
      duration: Math.min(0.9, 0.35 + value / 400),
      ease: EASE_OUT,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduce, value]);

  return (
    <span ref={ref} aria-label={format(value)}>
      <span aria-hidden>{format(display)}</span>
    </span>
  );
}

/** A spring-lifted press for buttons that need a tactile response. */
export function Press({ children, className, as = "button" }: { children: ReactNode; className?: string; as?: "button" | "div" }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      whileTap={{ scale: 0.96, y: 1 }}
      whileHover={{ y: -1 }}
      transition={spring}
    >
      {children}
    </Component>
  );
}