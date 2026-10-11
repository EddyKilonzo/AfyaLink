import { cx } from "@/components/ui/cx";
import type { ReactNode } from "react";

/**
 * Pure-CSS masonry grid.
 *
 * Uses `columns` so the browser lays items top-to-bottom in each column — no
 * JavaScript, no library, no layout shift. `gap` is the column gap; row gaps
 * are handled by `break-inside-avoid` on the children.
 *
 * Props:
 * - `cols`      number of columns (responsive breakpoints)
 * - `gap`       gap in rem
 * - `itemClass` extra classes applied to every child (e.g. mb-3)
 */
export function Masonry({
  cols = { default: 1, sm: 2, lg: 3 },
  gap = 1,
  itemClass,
  className,
  children,
}: {
  cols?: number | Partial<Record<"default" | "sm" | "md" | "lg" | "xl", number>>;
  gap?: number;
  itemClass?: string;
  className?: string;
  children: ReactNode;
}) {
  const breakpoints: ("default" | "sm" | "md" | "lg" | "xl")[] = ["default", "sm", "md", "lg", "xl"];
  const style: React.CSSProperties = {
    columnGap: `${gap}rem`,
    columnFill: "balance",
  };

  let css = `.masonry{column-fill:balance;}`;
  for (const bp of breakpoints) {
    const n = typeof cols === "number" ? cols : cols[bp];
    if (n == null) continue;
    const mq = bp === "default" ? "" : `@media (min-width: ${bp === "sm" ? "40rem" : bp === "md" ? "48rem" : bp === "lg" ? "64rem" : "80rem"})`;
    css += `${mq}{.masonry{column-count:${n};}}`;
  }

  return (
    <div style={style} className={cx("masonry", className)}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className={cx("contents", itemClass)}>{children}</div>
    </div>
  );
}

/** Wrap a child so it never breaks mid-card. */
export function MasonryItem({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("break-inside-avoid", "mb-3", className)} style={{ breakInside: "avoid" }}>
      {children}
    </div>
  );
}