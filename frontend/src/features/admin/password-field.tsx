"use client";

import { Check, Copy, Eye, EyeOff, Wand2 } from "lucide-react";
import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { cx } from "@/components/ui/cx";
import { inputClass } from "@/components/ui";
import { generatePassword } from "@/lib/password";

/**
 * Password input for admins setting someone else's password: show/hide,
 * generate a strong one, and copy it to hand over privately.
 */
export const PasswordField = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { onGenerate: (value: string) => void; currentValue?: string }>(
  function PasswordField({ onGenerate, currentValue, className, ...props }, ref) {
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    async function copy() {
      if (!currentValue) return;
      try {
        await navigator.clipboard.writeText(currentValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        setVisible(true); // Clipboard blocked: at least make it readable.
      }
    }

    const iconButton = "grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink";
    return (
      <div className="relative">
        <input ref={ref} type={visible ? "text" : "password"} autoComplete="new-password" spellCheck={false} {...props} className={cx(inputClass, "pr-[7.75rem] font-mono", className)} />
        <div className="absolute right-1.5 top-[calc(50%+3px)] flex -translate-y-1/2 items-center">
          <button type="button" className={iconButton} onClick={() => setVisible((v) => !v)} aria-label={visible ? "Hide password" : "Show password"} aria-pressed={visible}>
            {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
          </button>
          <button type="button" className={iconButton} onClick={() => void copy()} aria-label="Copy password" disabled={!currentValue}>
            {copied ? <Check className="size-4 text-synced" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          </button>
          <button
            type="button"
            className={iconButton}
            onClick={() => {
              onGenerate(generatePassword());
              setVisible(true);
            }}
            aria-label="Generate a strong password"
            title="Generate a strong password"
          >
            <Wand2 className="size-4" aria-hidden />
          </button>
        </div>
        <span className="sr-only" aria-live="polite">
          {copied ? "Password copied" : ""}
        </span>
      </div>
    );
  },
);
