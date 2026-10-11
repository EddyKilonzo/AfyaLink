import { cx } from "@/components/ui/cx";

/**
 * A rounded outline that draws itself in once on page load (CSS only, so it
 * runs before hydration; instant with reduced motion). Place inside a
 * `relative` element with the same corner radius.
 */
export function DrawnBorder({
  radius,
  tone = "light",
  delay = 150,
  className,
}: {
  /** Corner radius in px; must match the container's. */
  radius: number;
  tone?: "light" | "dark";
  delay?: number;
  className?: string;
}) {
  const stroke = tone === "light" ? "rgb(20 108 90 / 0.32)" : "rgb(183 230 209 / 0.38)";
  return (
    <svg aria-hidden focusable="false" className={cx("pointer-events-none absolute inset-0 z-[1] h-full w-full overflow-visible", className)}>
      {/* Static hairline underneath so the edge is always defined. */}
      <rect x="0.5" y="0.5" style={{ width: "calc(100% - 1px)", height: "calc(100% - 1px)" }} rx={radius} ry={radius} fill="none" stroke={tone === "light" ? "rgb(11 61 53 / 0.06)" : "rgb(255 255 255 / 0.06)"} />
      <rect
        x="0.75"
        y="0.75"
        rx={radius}
        ry={radius}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        pathLength={1}
        className="border-draw"
        style={{ width: "calc(100% - 1.5px)", height: "calc(100% - 1.5px)", animationDelay: `${delay}ms` }}
      />
    </svg>
  );
}
