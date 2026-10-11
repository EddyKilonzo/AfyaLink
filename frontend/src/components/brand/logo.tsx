import { cx } from "@/components/ui/cx";

/**
 * The AfyaLink mark: two interlocking links (people and care, connected) with
 * an amber node, a single report travelling between them.
 */
export function LogoMark({ className, tone = "brand" }: { className?: string; tone?: "brand" | "light" }) {
  const tile = tone === "brand" ? "#0b3d35" : "#ffffff";
  const a = tone === "brand" ? "#ddf5ea" : "#146c5a";
  const b = tone === "brand" ? "#6fd3ae" : "#3fae8c";
  return (
    <svg viewBox="0 0 32 32" className={cx("shrink-0", className)} aria-hidden focusable="false">
      <rect width="32" height="32" rx="9" fill={tile} />
      <g transform="rotate(-45 16 16)" fill="none" strokeWidth="2.6">
        <rect x="5" y="12.6" width="13" height="6.8" rx="3.4" stroke={a} />
        <rect x="14" y="12.6" width="13" height="6.8" rx="3.4" stroke={b} />
      </g>
      <circle cx="24.6" cy="7.4" r="2.6" fill="#f3b66a" />
    </svg>
  );
}

export function Logo({ className, tone = "brand", showWordmark = true }: { className?: string; tone?: "brand" | "light"; showWordmark?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8" tone={tone} />
      {showWordmark && (
        <span className={cx("text-[1.1875rem] font-semibold tracking-[-0.03em]", tone === "brand" ? "text-brand-900" : "text-white")}>
          Afya<span className={tone === "brand" ? "text-brand-600" : "text-brand-200"}>Link</span>
        </span>
      )}
    </span>
  );
}
