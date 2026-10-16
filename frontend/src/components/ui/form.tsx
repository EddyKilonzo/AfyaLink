"use client";

import { AlertCircle, Check, CheckCircle, ChevronDown, Eye, EyeOff, Loader2, X, XCircle } from "lucide-react";
import { forwardRef, type FormEvent, type Ref, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useCallback, useId, useRef, useState } from "react";
import { cx } from "./cx";
import { motion, AnimatePresence } from "framer-motion";

export const getErrorId = (name: string): string => `${name}-error`;
export const getHintId = (name: string): string => `${name}-hint`;

const CONTROL =
  "block w-full rounded-[10px] border border-line-strong bg-surface px-3.5 text-[0.9375rem] text-ink shadow-xs " +
  "placeholder:text-muted/70 transition-[border-color,box-shadow,background-color,transform] duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] " +
  "hover:border-brand-300 hover:shadow-[0_1px_2px_rgb(11_61_53/0.06),0_4px_12px_-4px_rgb(20_108_90/0.12)] " +
  "focus:border-brand-500 focus:outline-none focus:shadow-[var(--shadow-glow),0_4px_12px_-4px_rgb(20_108_90/0.16)] focus:-translate-y-[0.5px] " +
  "disabled:cursor-not-allowed disabled:bg-sunken disabled:text-muted [&:read-only:not(select)]:bg-sunken/60 " +
  "aria-[invalid=true]:border-error aria-[invalid=true]:focus:shadow-[0_0_0_4px_rgb(196_61_75/0.14),0_4px_12px_-4px_rgb(196_61_75/0.12)]";

export const inputClass = cx(CONTROL, "mt-1.5 min-h-12 py-2.5");

export interface ValidationRule<T = string> {
  validate: (value: T) => string | true;
  message: string;
}

export interface FieldConfig {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  optional?: boolean;
  error?: string;
  validate?: ValidationRule | ValidationRule[];
  className?: string;
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      id={id}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mt-1.5 flex items-start gap-1.5 text-[0.8125rem] font-medium text-error"
      role="alert"
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      {message}
    </motion.p>
  );
}

export function FieldHint({ id, children }: { id: string; children: ReactNode }) {
  return (
    <motion.p
      id={id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-1.5 text-[0.8125rem] text-muted"
    >
      {children}
    </motion.p>
  );
}

export function Field({
  name,
  label,
  hint,
  error,
  required,
  optional,
  children,
  className,
  showSuccess = false,
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
  showSuccess?: boolean;
}) {
  return (
    <div className={cx(className)}>
      <label htmlFor={name} className="flex items-baseline gap-1 text-sm font-semibold text-ink">
        {label}
        {required && <span className="text-error" aria-hidden>*</span>}
        {optional && <span className="text-xs font-normal text-muted">Optional</span>}
      </label>
      <div className="relative">
        {children}
        <AnimatePresence mode="popLayout">
          {showSuccess && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-success"
            >
              <CheckCircle className="size-5" aria-hidden />
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-error"
            >
              <XCircle className="size-5" aria-hidden />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence mode="popLayout">
        {hint && !error && <FieldHint id={getHintId(name)}>{hint}</FieldHint>}
        <FieldError id={getErrorId(name)} message={error} />
      </AnimatePresence>
    </div>
  );
}

export function getDescribedById(name: string, error?: string, hint?: ReactNode): string {
  if (error) return getErrorId(name);
  if (hint) return getHintId(name);
  return "";
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  showPasswordToggle?: boolean;
  characterCount?: number;
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, showPasswordToggle, characterCount, id, type = "text", value, onChange, icon, ...props }, ref) {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = useId();
    const fieldId = id || inputId;
    const isPassword = type === "password";
    const showToggle = showPasswordToggle && isPassword;
    const displayType = isPassword && !showPassword ? "password" : "text";
    const length = (value as string)?.length || 0;
    const isOverLimit = characterCount && length > characterCount;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        if (characterCount && e.target.value.length > characterCount) return;
        onChange?.(e);
      },
      [characterCount, onChange]
    );

    return (
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" aria-hidden>{icon}</span>}
        <input
          ref={ref}
          id={fieldId}
          type={displayType}
          value={value}
          onChange={handleChange}
          className={cx(CONTROL, "mt-1.5 min-h-12 py-2.5 pr-12", icon ? "pl-11" : undefined, isOverLimit ? "border-error" : undefined, className)}
          aria-invalid={isOverLimit ? "true" : "false"}
          aria-describedby={isOverLimit ? getErrorId(fieldId) : undefined}
          {...props}
        />
        {showToggle && (
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors duration-[var(--duration-micro)]"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        )}
        {characterCount && (
          <div
            className={cx(
              "absolute bottom-1.5 right-3 text-[0.6875rem] transition-colors duration-[var(--duration-micro)]",
              isOverLimit ? "text-error" : "text-muted"
            )}
            aria-live="polite"
          >
            {length} / {characterCount}
          </div>
        )}
      </div>
    );
  }
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & { characterCount?: number; icon?: ReactNode }>(
  function Textarea({ className, characterCount, id, value, onChange, icon, ...props }, ref) {
    const textareaId = useId();
    const fieldId = id || textareaId;
    const length = (value as string)?.length || 0;
    const isOverLimit = characterCount && length > characterCount;

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        if (characterCount && e.target.value.length > characterCount) return;
        onChange?.(e);
      },
      [characterCount, onChange]
    );

    return (
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-3 text-muted pointer-events-none" aria-hidden>{icon}</span>}
        <textarea
          ref={ref}
          id={fieldId}
          value={value}
          onChange={handleChange}
          className={cx(CONTROL, "mt-1.5 min-h-24 resize-y py-3 leading-relaxed pr-4", icon ? "pl-11" : undefined, isOverLimit ? "border-error" : undefined, className)}
          aria-invalid={isOverLimit ? "true" : "false"}
          aria-describedby={isOverLimit ? getErrorId(fieldId) : undefined}
          {...props}
        />
        {characterCount && (
          <div
            className={cx(
              "absolute bottom-1.5 right-3 text-[0.6875rem] transition-colors duration-[var(--duration-micro)]",
              isOverLimit ? "text-error" : "text-muted"
            )}
            aria-live="polite"
          >
            {length} / {characterCount}
          </div>
        )}
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
  }
);

export const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }>(
  function Checkbox({ label, description, className, id, ...props }, ref) {
    const checkboxId = useId();
    const fieldId = id || checkboxId;
    return (
      <label htmlFor={fieldId} className={cx("flex cursor-pointer items-start gap-3 rounded-xl p-1 transition-colors hover:bg-sunken/50", className)}>
        <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
          <input
            ref={ref}
            id={fieldId}
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
  }
);

export const RadioGroup = forwardRef<HTMLFieldSetElement, { name: string; options: { value: string; label: ReactNode; description?: ReactNode }[]; className?: string }>(
  function RadioGroup({ name, options, className, ...props }, ref) {
    return (
      <fieldset ref={ref} className={cx("space-y-3", className)} {...props}>
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-all duration-[var(--duration-micro)] hover:bg-sunken/50 border border-transparent hover:border-line">
            <span className="relative mt-0.5 grid size-5 shrink-0 place-items-center">
              <input
                type="radio"
                name={name}
                value={option.value}
                className="peer size-5 appearance-none rounded-full border border-line-strong bg-surface shadow-xs transition-all duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] checked:border-brand-600 checked:bg-brand-600 focus-visible:shadow-[var(--shadow-glow)] focus-visible:outline-none hover:border-brand-300"
              />
              <span className="pointer-events-none absolute size-2.5 bg-white opacity-0 peer-checked:opacity-100 peer-checked:scale-100 scale-0 transition-all duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] rounded-full" aria-hidden />
            </span>
            <span className="text-sm">
              <span className="font-semibold text-ink">{option.label}</span>
              {option.description && <span className="block text-muted">{option.description}</span>}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }
);

export interface FormProps {
  onSubmit: (data: FormData) => Promise<void> | void;
  children: ReactNode;
  className?: string;
  initialValues?: Record<string, string>;
  validate?: (data: FormData) => Record<string, string>;
}

export function Form({ onSubmit, children, className, initialValues = {}, validate }: FormProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<"idle" | "success" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = e.currentTarget;
      const formData = new FormData(form);

      const validationErrors = validate?.(formData) || {};
      const hasErrors = Object.values(validationErrors).some((v) => v);

      if (hasErrors) {
        setErrors(validationErrors);
        setSubmitStatus("error");
        const firstError = form.querySelector("[aria-invalid='true']") as HTMLElement;
        firstError?.focus({ preventScroll: true });
        return;
      }

      setErrors({});
      setSubmitStatus("idle");
      setIsSubmitting(true);

      try {
        await onSubmit(formData);
        setSubmitStatus("success");
      } catch (error) {
        setSubmitStatus("error");
        if (error instanceof Response || (error && typeof error === "object" && "status" in error)) {
          const status = (error as { status: number }).status;
          if (status === 400) {
            const err = await (error as Response).json().catch(() => ({}));
            if (err.fieldErrors) setErrors(err.fieldErrors);
          }
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSubmit, validate]
  );

  const resetForm = useCallback(() => {
    setErrors({});
    setSubmitStatus("idle");
    formRef.current?.reset();
    if (initialValues) {
      Object.entries(initialValues).forEach(([key, value]) => {
        const input = formRef.current?.elements.namedItem(key) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (input) input.value = value;
      });
    }
  }, [initialValues]);

  return (
    <form method="post" ref={formRef} onSubmit={handleSubmit} className={cx("space-y-6", className)} noValidate>
      {children}

      <AnimatePresence mode="popLayout">
        {submitStatus === "success" && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-2.5 rounded-xl bg-success-bg p-3.5 text-sm text-success ring-1 ring-inset ring-success/15"
            role="status"
          >
            <CheckCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>Saved successfully</p>
          </motion.div>
        )}
        {submitStatus === "error" && !Object.keys(errors).some((k) => errors[k]) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex gap-2.5 rounded-xl bg-failed-bg p-3.5 text-sm text-failed ring-1 ring-inset ring-failed/15"
            role="alert"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>Something went wrong. Please try again.</p>
          </motion.div>
        )}
      </AnimatePresence>

      <FormActions onReset={resetForm} isSubmitting={isSubmitting} />
    </form>
  );
}

interface FormActionsProps {
  onReset?: () => void;
  isSubmitting: boolean;
  submitLabel?: string;
  resetLabel?: string;
  showReset?: boolean;
}

export function FormActions({ onReset, isSubmitting, submitLabel = "Save", resetLabel = "Reset", showReset = true }: FormActionsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      <motion.button
        type="submit"
        disabled={isSubmitting}
        className={cx(
          "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] press",
          "bg-brand-600 hover:bg-brand-700 active:bg-brand-800",
          "shadow-brand-sm hover:shadow-brand-md",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600 disabled:shadow-brand-sm"
        )}
        whileTap={{ scale: 0.98 }}
      >
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        <span>{isSubmitting ? "Saving…" : submitLabel}</span>
      </motion.button>
      {showReset && onReset && (
        <button
          type="button"
          onClick={onReset}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-ink transition-all duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] press bg-sunken hover:bg-line active:bg-line-strong disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="size-4" aria-hidden />
          {resetLabel}
        </button>
      )}
    </div>
  );
}

interface FieldArrayItemProps {
  children: (index: number, remove: () => void) => ReactNode;
  label?: string;
  minItems?: number;
  maxItems?: number;
  addLabel?: string;
}

export function FieldArray({ children, label, minItems = 0, maxItems = 10, addLabel = "Add another" }: FieldArrayItemProps) {
  const [items, setItems] = useState<number[]>(Array.from({ length: Math.max(1, minItems) }, (_, i) => i));
  const nextId = useRef(items.length);

  const add = () => {
    if (items.length >= maxItems) return;
    const id = nextId.current++;
    setItems((prev) => [...prev, id]);
  };

  const remove = (id: number) => {
    if (items.length <= minItems) return;
    setItems((prev) => prev.filter((item) => item !== id));
  };

  return (
    <div className="space-y-4">
      {label && <h4 className="text-sm font-semibold text-ink">{label}</h4>}
      <AnimatePresence mode="popLayout">
        {items.map((id) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="relative p-4 rounded-xl border border-line bg-sunken/50"
          >
            <div className="flex items-start justify-between gap-2 mb-3">
              {children(id, () => remove(id))}
              <button
                type="button"
                onClick={() => remove(id)}
                disabled={items.length <= minItems}
                className="shrink-0 p-1.5 rounded-lg text-muted hover:text-error hover:bg-failed-bg/20 transition-colors duration-[var(--duration-micro)] disabled:opacity-30 disabled:hover:bg-transparent"
                aria-label="Remove"
              >
                <X className="size-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {items.length < maxItems && (
        <button
          type="button"
          onClick={add}
          className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 active:bg-brand-200 border border-brand-200 transition-all duration-[var(--duration-micro)]"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {addLabel}
        </button>
      )}
    </div>
  );
}

export function ServerErrors({ error, fieldErrors }: { error: string | null; fieldErrors?: string[] }) {
  if (!error) return null;
  const list = fieldErrors && fieldErrors.length > 1 ? fieldErrors : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      role="alert"
      className="flex gap-2.5 rounded-xl bg-failed-bg p-3.5 text-sm text-failed ring-1 ring-inset ring-failed/15"
    >
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
    </motion.div>
  );
}

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

/** Shared look for a floated label: small, inside the top of the control. */
const FLOATING_LABEL =
  "pointer-events-none absolute left-3.5 top-2 z-[1] flex items-baseline gap-0.5 text-[0.75rem] font-medium leading-4 text-muted " +
  "transition-[top,font-size,color] duration-[var(--duration-micro)] ease-[var(--ease-emphasize)] " +
  "group-focus-within:text-brand-600 group-has-[[aria-invalid=true]]:text-error group-has-[:disabled]:text-muted/60";

/**
 * Text-like controls drop the label to placeholder size while empty and not
 * focused. Needs the control to carry `peer` and come before the label. Selects
 * and date inputs never match :placeholder-shown, so their label stays floated.
 */
const FLOAT_DOWN_WHEN_EMPTY =
  "peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-[0.9375rem] peer-placeholder-shown:font-normal " +
  "peer-focus:top-2 peer-focus:text-[0.75rem] peer-focus:font-medium";

function FloatingLabel({ name, label, required, optional, floatDown }: { name: string; label: string; required?: boolean; optional?: boolean; floatDown?: boolean }) {
  return (
    <label htmlFor={name} className={cx(FLOATING_LABEL, floatDown && FLOAT_DOWN_WHEN_EMPTY)}>
      {label}
      {required && <span className="text-error" aria-hidden>*</span>}
      {optional && <span className="ml-1 text-[0.75rem] font-normal text-muted">Optional</span>}
    </label>
  );
}

function CharacterCount({ count, max }: { count: number; max: number }) {
  return (
    <span className={cx("ml-auto shrink-0 pt-1.5 text-[0.6875rem] tabular-nums", count > max ? "text-error" : "text-muted")} aria-live="polite">
      {count} / {max}
    </span>
  );
}

/**
 * A control in a box with its label inside. Hint, counter and error sit below
 * the box so they never shift the label. `children` renders the control first
 * (marked `peer` when its label should float down while empty).
 */
export function FloatingLabelField({
  name,
  label,
  hint,
  error,
  required,
  optional,
  children,
  className,
  showSuccess = false,
  floatDown = false,
  count,
  maxCount,
}: {
  name: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
  className?: string;
  showSuccess?: boolean;
  floatDown?: boolean;
  count?: number;
  maxCount?: number;
}) {
  const showHint = Boolean(hint) && !error;
  return (
    <div className={className}>
      <div className="group relative">
        {children}
        <FloatingLabel name={name} label={label} required={required} optional={optional} floatDown={floatDown} />
        <AnimatePresence mode="popLayout">
          {showSuccess && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-success"
            >
              <CheckCircle className="size-5" aria-hidden />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {(showHint || maxCount) && (
        <div className="flex items-start gap-3">
          {showHint && <FieldHint id={getHintId(name)}>{hint}</FieldHint>}
          {maxCount ? <CharacterCount count={count ?? 0} max={maxCount} /> : null}
        </div>
      )}
      <FieldError id={getErrorId(name)} message={error} />
    </div>
  );
}

function describedByFor(name: string, error?: string, hint?: ReactNode): string | undefined {
  return error ? getErrorId(name) : hint ? getHintId(name) : undefined;
}

/** Length of a controlled value, for callers that do not pass `count`. */
function lengthOf(value: unknown): number {
  return typeof value === "string" ? value.length : 0;
}

type FloatingExtras = {
  name: string;
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  showSuccess?: boolean;
  /** Show "count / characterCount" under the field. */
  characterCount?: number;
  /** Current length for the counter; needed with uncontrolled inputs (react-hook-form `register`). */
  count?: number;
};

export function FloatingLabelInput({
  name,
  label,
  hint,
  error,
  required,
  optional,
  characterCount,
  count,
  showSuccess = false,
  className,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "name"> & FloatingExtras & { ref?: Ref<HTMLInputElement> }) {
  return (
    <FloatingLabelField
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      showSuccess={showSuccess}
      floatDown
      maxCount={characterCount}
      count={count ?? lengthOf(props.value)}
    >
      <input
        id={name}
        name={name}
        {...props}
        className={cx(CONTROL, "peer min-h-12 px-3.5 pb-2 pt-6", className)}
        aria-invalid={!!error}
        aria-describedby={describedByFor(name, error, hint)}
        placeholder=" "
      />
    </FloatingLabelField>
  );
}

export function FloatingLabelTextarea({
  name,
  label,
  hint,
  error,
  required,
  optional,
  characterCount,
  count,
  showSuccess = false,
  className,
  ...props
}: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "name"> & FloatingExtras & { ref?: Ref<HTMLTextAreaElement> }) {
  return (
    <FloatingLabelField
      name={name}
      label={label}
      hint={hint}
      error={error}
      required={required}
      optional={optional}
      showSuccess={showSuccess}
      floatDown
      maxCount={characterCount}
      count={count ?? lengthOf(props.value)}
    >
      <textarea
        id={name}
        name={name}
        {...props}
        className={cx(CONTROL, "peer min-h-24 resize-y px-3.5 pb-2 pt-6 leading-relaxed", className)}
        aria-invalid={!!error}
        aria-describedby={describedByFor(name, error, hint)}
        placeholder=" "
      />
    </FloatingLabelField>
  );
}

export function FloatingLabelSelect({
  name,
  label,
  hint,
  error,
  required,
  optional,
  children,
  showSuccess = false,
  className,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "name"> & Omit<FloatingExtras, "characterCount" | "count"> & { ref?: Ref<HTMLSelectElement> }) {
  return (
    <FloatingLabelField name={name} label={label} hint={hint} error={error} required={required} optional={optional} showSuccess={showSuccess}>
      <select
        id={name}
        name={name}
        {...props}
        className={cx(CONTROL, "min-h-12 cursor-pointer appearance-none pb-2 pl-3.5 pr-10 pt-6", className)}
        aria-invalid={!!error}
        aria-describedby={describedByFor(name, error, hint)}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-muted transition-colors group-focus-within:text-brand-600"
        aria-hidden
      />
    </FloatingLabelField>
  );
}
