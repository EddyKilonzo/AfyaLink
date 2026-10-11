import { Loader2 } from "lucide-react";
import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "./cx";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "inverse";
export type ButtonSize = "sm" | "md" | "lg";

const BASE =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[-0.005em] " +
  "press transition-[background-color,border-color,color,box-shadow] duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] " +
  "active:translate-y-[1.5px] active:scale-[0.97] active:duration-75 disabled:pointer-events-none disabled:opacity-55 " +
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/35 focus-visible:ring-offset-0";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 " +
    "shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(11_61_53/0.25),0_6px_16px_-6px_rgb(20_108_90/0.55)] " +
    "hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(11_61_53/0.25),0_10px_22px_-8px_rgb(20_108_90/0.65)] " +
    "active:shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_1px_2px_rgb(11_61_53/0.25),0_3px_8px_-4px_rgb(20_108_90/0.6)]",
  secondary: "bg-brand-100 text-brand-800 hover:bg-brand-200/80",
  outline:
    "border border-line-strong bg-surface text-ink shadow-xs hover:border-brand-300 hover:bg-brand-50/60",
  ghost: "text-muted hover:bg-sunken hover:text-ink",
  danger:
    "bg-error text-white hover:bg-[#a9323f] shadow-[inset_0_1px_0_rgb(255_255_255/0.12),0_6px_16px_-8px_rgb(196_61_75/0.6)]",
  inverse: "bg-white text-brand-900 hover:bg-brand-50 shadow-[0_8px_24px_-10px_rgb(0_0_0/0.45)]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-9 rounded-[10px] px-3 text-[0.8125rem]",
  md: "min-h-11 rounded-[11px] px-4 text-sm",
  lg: "min-h-12 rounded-[12px] px-5 text-[0.9375rem]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cx(BASE, VARIANTS[variant], SIZES[size], className);
}

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Icon before the label (hidden while loading). */
  icon?: ReactNode;
  /** Icon after the label. */
  trailingIcon?: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  trailingIcon,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & CommonProps & { loading?: boolean }) {
  return (
    <button
      {...props}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {trailingIcon}
    </button>
  );
}

/** A Next.js link styled as a button (navigation, not an action). */
export function ButtonLink({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  className,
  children,
  ...props
}: ComponentProps<typeof Link> & CommonProps) {
  return (
    <Link {...props} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
      {trailingIcon}
    </Link>
  );
}

/** Same look for in-page anchors (`#features`), where Next's Link adds nothing. */
export function ButtonAnchor({
  variant = "primary",
  size = "md",
  icon,
  trailingIcon,
  className,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps) {
  return (
    <a {...props} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
      {trailingIcon}
    </a>
  );
}

/** Square icon-only button. `label` is required: it is the accessible name. */
export function IconButton({
  label,
  variant = "ghost",
  className,
  children,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: ButtonVariant }) {
  return (
    <button
      {...props}
      type={type}
      aria-label={label}
      title={label}
      className={cx(BASE, VARIANTS[variant], "size-10 rounded-[10px] p-0 [&_svg]:size-[18px]", className)}
    >
      {children}
    </button>
  );
}
