"use client";

import { motion } from "motion/react";
import { useId, type ReactNode } from "react";
import { cx } from "./cx";

/**
 * A small set of mutually exclusive options (period, view mode). Radio
 * semantics, so arrow keys move between options.
 */
export function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
  size = "md",
}: {
  label: string;
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const group = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cx("inline-flex rounded-xl bg-sunken p-1 ring-1 ring-inset ring-line", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <label
            key={String(option.value)}
            className={cx(
              "relative flex cursor-pointer select-none items-center justify-center gap-1.5 rounded-[9px] font-semibold transition-colors duration-[var(--duration-micro)]",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40",
              size === "sm" ? "h-8 px-2.5 text-xs" : "h-9 px-3.5 text-[0.8125rem]",
              selected ? "text-ink" : "text-muted hover:text-ink",
            )}
          >
            <input
              type="radio"
              name={group}
              value={String(option.value)}
              checked={selected}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {selected && (
              <motion.span
                layoutId={`${group}-thumb`}
                className="absolute inset-0 rounded-[9px] bg-surface shadow-[var(--shadow-ring),var(--shadow-xs)]"
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.8 }}
                aria-hidden
              />
            )}
            <span className="relative inline-flex items-center gap-1.5 [&_svg]:size-3.5">{option.label}</span>
          </label>
        );
      })}
    </div>
  );
}
