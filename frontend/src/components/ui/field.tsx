import { AlertCircle, Check, ChevronDown } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

export const errorId = (name: string) => `${name}-error`;
export const hintId = (name: string) => `${name}-hint`;

const CONTROL =
  "block w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-[0.9375rem] text-ink shadow-xs " +
  "placeholder:text-muted/70 transition-[border-color,box-shadow,background-color,transform] duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] " +
  "hover:border-brand-300 hover:shadow-[0_1px_2px_rgb(11_61_53/0.06),0_4px_12px_-4px_rgb(20_108_90/0.12)] " +
  "focus:border-brand-500 focus:outline-none focus:shadow-[var(--shadow-glow),0_4px_12px_-4px_rgb(20_108_90/0.16)] focus:-translate-y-[0.5px] " +
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted [&:read-only:not(select)]:bg-sunken/60 " +
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus:shadow-[0_0_0_4px_rgb(196_61_75/0.14),0_4px_12px_-4px_rgb(196_61_75/0.12)]";

/** Class for native controls not wrapped by the components below. */
export const inputClass = cx(CONTROL, "mt-1.5 min-h-12 py-2.5");

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] font-medium text-error">
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/**
 * Label + control + hint + error. Give the control `id={name}` and
 * `aria-describedby={describedBy(name, error, hint)}`.
 */
export function Field({
  name,
  label,
  hint,
  error,
  required,
  optional,
  children,
  className,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="flex items-baseline gap-1 text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="text-error" aria-hidden>
            *
          </span>
        )}
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId(name)} className="mt-1.5 text-[0.8125rem] text-muted">
          {hint}
        </p>
      )}
      <FieldError id={errorId(name)} message={error} />
    </div>
  );
}

export function describedBy(name: string, error?: string, hint?: ReactNode): string | undefined {
  if (error) return errorId(name);
  if (hint) return hintId(name);
  return undefined;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }>(
  function Input({ className, icon, ...props }, ref) {
    return (
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden>{icon}</span>}
        <input
          ref={ref}
          {...props}
          className={cx(CONTROL, "mt-1.5 min-h-12 py-2.5", icon ? "pl-11" : undefined, className)}
        />
      </div>
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { icon?: ReactNode }>(
  function Textarea({ className, icon, ...props }, ref) {
    return (
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-3 text-muted pointer-events-none" aria-hidden>{icon}</span>}
        <textarea
          ref={ref}
          {...props}
          className={cx(CONTROL, "mt-1.5 min-h-24 resize-y py-3 leading-relaxed", icon ? "pl-11" : undefined, className)}
        />
      </div>
    );
  }
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { wrapperClassName?: string }>(
  function Select({ className, wrapperClassName, children, ...props }, ref) {
    return (
      <div className={cx("relative mt-1.5", wrapperClassName)}>
        <select ref={ref} {...props} className={cx(CONTROL, "min-h-12 appearance-none py-2.5 pr-10", className)}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
      </div>
    );
  },
);

/** Compact select for toolbars and filters (no top margin, smaller height). */
export function FilterSelect({ label, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div className={cx("relative", className)}>
      <select
        aria-label={label}
        {...props}
        className={cx(CONTROL, "min-h-10 appearance-none rounded-[10px] py-1.5 pr-9 text-sm font-medium")}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
    </div>
  );
}

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }>(
  function Checkbox({ label, description, className, id, ...props }, ref) {
    return (
      <label htmlFor={id} className={cx("flex cursor-pointer items-start gap-3 rounded-xl p-1 transition-colors hover:bg-sunken/50", className)}>
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            {...props}
            className="peer size-5 appearance-none rounded-md border border-line-strong bg-surface shadow-xs transition-all duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] checked:border-brand-600 checked:bg-brand-600 focus-visible:shadow-[var(--shadow-glow)] focus-visible:outline-none hover:border-brand-300"
          />
          <Check className="pointer-events-none absolute size-3.5 text-white opacity-0 peer-checked:opacity-100 peer-checked:scale-100 scale-75 transition-all duration-[var(--duration-micro)] ease-[var(--ease-emphasize)]" strokeWidth={3} aria-hidden />
        </span>
        <span className="text-sm">
          <span className="font-semibold text-ink">{label}</span>
          {description && <span className="block text-muted">{description}</span>}
        </span>
      </label>
    );
  },
);

/** Server-side validation messages from a 400, shown at the top of a form. */
export function ServerErrors({ error, fieldErrors }: { error: string | null; fieldErrors?: string[] }) {
  if (!error) return null;
  const list = fieldErrors && fieldErrors.length > 1 ? fieldErrors : null;
  return (
    <div role="alert" className="flex gap-2.5 rounded-xl bg-failed-bg p-3.5 text-sm text-failed ring-1 ring-inset ring-failed/15">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      {list ? (
        <ul className="list-disc space-y-0.5 pl-4">
          {list.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      ) : (
        <p>{error}</p>
      )}
    </div>
  );
}

/** Group of related fields with a heading, for long forms on mobile. */
export function FormSection({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-5 border-t border-line pt-6 first:border-t-0 first:pt-0">
      <legend className="float-left mb-1 w-full">
        <span className="text-h3 text-ink">{title}</span>
        {description && <span className="mt-0.5 block text-sm font-normal text-muted">{description}</span>}
      </legend>
      <div className="clear-both space-y-5">{children}</div>
    </fieldset>
  );
}
