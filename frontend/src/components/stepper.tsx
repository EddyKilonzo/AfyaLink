import { Check } from "lucide-react";
import { cx } from "@/components/ui/cx";

export type StepDef = { label: string; description?: string };

/**
 * Pure-CSS horizontal stepper. The active step is filled; completed steps show
 * a check. Vertical on phones, horizontal from tablet up.
 */
export function Stepper({ steps, current, className }: { steps: StepDef[]; current: number; className?: string }) {
  return (
    <ol className={cx("flex items-center", className)}>
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const last = i === steps.length - 1;
        return (
          <li key={s.label} className={cx("flex items-center", !last && "flex-1")}>
            <span className="flex flex-col items-center gap-1.5 text-center">
              <span
                className={cx(
                  "grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold transition-[background-color,color,box-shadow] duration-[var(--duration-ui)]",
                  done && "bg-brand-600 text-white shadow-[var(--shadow-glow)]",
                  active && "bg-brand-50 text-brand-700 ring-2 ring-brand-200",
                  !done && !active && "bg-sunken text-muted ring-1 ring-line",
                )}
              >
                {done ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cx("text-xs font-semibold", active ? "text-ink" : "text-muted")}>{s.label}</span>
              {s.description && <span className="hidden text-[0.6875rem] text-muted sm:inline">{s.description}</span>}
            </span>
            {!last && (
              <span
                className={cx(
                  "mx-2 hidden h-px flex-1 min-w-4 md:block",
                  done ? "bg-brand-600" : "bg-line-strong",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}