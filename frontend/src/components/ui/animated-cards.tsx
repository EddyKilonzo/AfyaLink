"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { cx } from "@/components/ui/cx";
import { EASE_OUT, EASE_EMPHASIZE, DURATION } from "@/components/motion";

const DURATION_UI = DURATION.ui * 1000;

interface AnimatedCardProps extends Omit<HTMLMotionProps<"div">, "children" | "initial" | "animate" | "exit" | "transition"> {
  children: ReactNode;
  variant?: "default" | "elevated" | "glass" | "gradient-border" | "interactive";
  hover?: boolean;
  staggerIndex?: number;
  className?: string;
  as?: "div" | "article" | "section";
}

export function AnimatedCard({
  children,
  variant = "default",
  hover = false,
  staggerIndex = 0,
  className,
  as, // eslint-disable-line @typescript-eslint/no-unused-vars
  style,
  ...props
}: AnimatedCardProps) {
  
  const baseStyles = {
    opacity: 0,
    y: 20,
  };

  const animatedStyles = {
    opacity: 1,
    y: 0,
  };

  const exitStyles = {
    opacity: 0,
    y: -10,
    transition: { duration: 0.15, ease: EASE_OUT },
  };

  const transition = {
    duration: DURATION_UI / 1000,
    ease: EASE_OUT,
    delay: staggerIndex * 0.08,
  };

  const hoverTransition = {
    duration: DURATION_UI / 1000,
    ease: EASE_EMPHASIZE,
  };

  const variants = {
    initial: baseStyles,
    animate: animatedStyles,
    exit: exitStyles,
    hover: hover ? { y: -4, scale: 1.005, boxShadow: "var(--shadow-card-hover)" } : {},
    tap: { scale: 0.99 },
  };

  const variantClasses = {
    default: "bg-surface rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] border border-line",
    elevated: "bg-surface rounded-[var(--radius-xl)] shadow-[var(--shadow-lg)]",
    glass: "glass-card rounded-[var(--radius-xl)]",
    "gradient-border": "relative overflow-hidden bg-surface rounded-[var(--radius-xl)]",
    interactive: "bg-surface rounded-[var(--radius-xl)] shadow-[var(--shadow-card)] border border-line press-lift",
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      whileHover={hover ? "hover" : undefined}
      whileTap={hover ? "tap" : undefined}
      transition={transition}
      className={cx(
        "relative overflow-hidden",
        variantClasses[variant],
        className
      )}
      style={style}
      {...props}
    >
      {variant === "gradient-border" && (
        <motion.div
          className="absolute inset-0 rounded-[var(--radius-xl)]"
          style={{
            background: "linear-gradient(135deg, var(--color-brand-500), var(--color-brand-200), var(--color-amber))",
            opacity: 0,
            zIndex: -1,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          transition={hoverTransition}
          whileHover={{ opacity: 1 }}
        />
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </motion.div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | string | null | undefined;
  hint?: ReactNode;
  icon?: ReactNode;
  trend?: { value: number; label: string; positive?: boolean };
  className?: string;
  staggerIndex?: number;
}

export function MetricCard({ label, value, hint, icon, trend, className, staggerIndex = 0 }: MetricCardProps) {
  return (
    <AnimatedCard variant="default" staggerIndex={staggerIndex} className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label">{label}</p>
          <p className="mt-2 text-metric text-ink tabular-nums animate-count-up">
            {value === null || value === undefined ? (
              <span className="shimmer h-8 w-16 inline-block rounded" aria-hidden="true" />
            ) : (
              typeof value === "number" ? value.toLocaleString() : value
            )}
          </p>
          {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
        </div>
        {icon && (
          <div className="shrink-0 grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1.5 text-sm font-medium" style={{ color: trend.positive ? "var(--color-success)" : "var(--color-error)" }}>
          <span aria-hidden="true">{trend.positive ? "↑" : "↓"}</span>
          <span>{trend.value.toLocaleString()}</span>
          <span className="text-muted">{trend.label}</span>
        </div>
      )}
    </AnimatedCard>
  );
}

interface StatCardProps {
  label: string;
  value: number | string | null | undefined;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "brand" | "amber" | "error" | "success";
  className?: string;
  staggerIndex?: number;
}

export function StatCard({ label, value, hint, icon, tone = "default", className, staggerIndex = 0 }: StatCardProps) {
  const toneStyles = {
    default: "bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100",
    brand: "bg-brand-600 text-white",
    amber: "bg-amber-soft text-amber-ink ring-1 ring-inset ring-amber/40",
    error: "bg-failed-bg text-failed ring-1 ring-inset ring-failed/15",
    success: "bg-success/10 text-success ring-1 ring-inset ring-success/20",
  };

  return (
    <AnimatedCard variant="default" staggerIndex={staggerIndex} className={className}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label">{label}</p>
          <p className="mt-2 text-metric text-ink tabular-nums animate-count-up">
            {value === null || value === undefined ? (
              <span className="shimmer h-8 w-16 inline-block rounded" aria-hidden="true" />
            ) : (
              typeof value === "number" ? value.toLocaleString() : value
            )}
          </p>
          {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
        </div>
        {icon && (
          <div className={cx("shrink-0 grid size-10 place-items-center rounded-xl", toneStyles[tone])}>
            {icon}
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}

interface InfoCardProps {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  variant?: "default" | "bordered" | "elevated" | "glass";
  className?: string;
  staggerIndex?: number;
}

export function InfoCard({ title, description, children, action, icon, variant = "default", className, staggerIndex = 0 }: InfoCardProps) {
  const variantClasses = {
    default: "bg-surface shadow-[var(--shadow-card)] border border-line",
    bordered: "bg-surface border border-line-strong",
    elevated: "bg-surface shadow-[var(--shadow-lg)]",
    glass: "glass-card",
  };

  return (
    <AnimatedCard variant="default" staggerIndex={staggerIndex} className={cx(variantClasses[variant], className)}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {icon && (
              <div className="mb-3 grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
                {icon}
              </div>
            )}
            <h3 className="text-h3 text-ink">{title}</h3>
            {description && <p className="mt-1.5 text-sm text-muted">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
        {children && <div className="mt-5">{children}</div>}
      </div>
    </AnimatedCard>
  );
}

interface FeatureCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
  action?: ReactNode;
  variant?: "default" | "interactive" | "glass";
  className?: string;
  staggerIndex?: number;
}

export function FeatureCard({ title, description, icon, href, action, variant = "default", className, staggerIndex = 0 }: FeatureCardProps) {
  const isLink = !!href;
  
  return (
    <AnimatedCard 
      variant={isLink ? "interactive" : variant} 
      hover={isLink} 
      staggerIndex={staggerIndex} 
      className={cx("h-full flex flex-col", className)}
      as={isLink ? "article" : "div"}
    >
      <div className="p-5 sm:p-6 flex flex-col h-full">
        <div className="mb-4 grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">
          {icon}
        </div>
        <h3 className="text-h3 text-ink mb-2">{title}</h3>
        <p className="text-sm text-muted flex-1 leading-relaxed">{description}</p>
        {(action || isLink) && (
          <div className="mt-4 flex items-center gap-2">
            {action}
            {isLink && (
              <a 
                href={href} 
                className="text-sm font-semibold text-brand-700 hover:underline flex items-center gap-1"
              >
                Learn more
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
            )}
          </div>
        )}
      </div>
    </AnimatedCard>
  );
}

export function CardGrid({ children, className, columns = 4, gap = 6 }: { 
  children: ReactNode; 
  className?: string;
  columns?: number;
  gap?: number;
}) {
  return (
    <div 
      className={cx(
        "grid", 
        `gap-${gap}`, 
        `grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`,
        className
      )}
      role="list"
    >
      {children}
    </div>
  );
}

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div 
      className={cx(
        "grid gap-6",
        "grid-cols-1",
        "sm:grid-cols-2",
        "lg:grid-cols-4",
        "xl:grid-cols-[repeat(4,minmax(0,1fr))]",
        className
      )}
      role="list"
    >
      {children}
    </div>
  );
}