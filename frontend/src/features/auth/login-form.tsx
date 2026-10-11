"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { EASE_OUT } from "@/components/motion";
import { Button, describedBy, ErrorState, Field, Input } from "@/components/ui";
import { toErrorMessage } from "@/lib/api";
import { safeNextPath } from "@/lib/security";
import { useAuth } from "./auth-context";
import { loginSchema, otpSchema, type LoginValues } from "./schemas";

function readQuery(): { next: string | null; expired: boolean } {
  const params = new URLSearchParams(window.location.search);
  return { next: params.get("next"), expired: params.get("expired") === "1" };
}

export function LoginForm() {
  const { login, status, user } = useAuth();
  const router = useRouter();
  const [needsOtp, setNeedsOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  useEffect(() => {
    // Read once on mount; useSearchParams would force a Suspense boundary for one flag.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (readQuery().expired) setNotice("Your session ended. Sign in again to continue.");
  }, []);

  // Already signed in (e.g. back button): go straight to the app.
  useEffect(() => {
    if (status === "authenticated" && user) router.replace(safeNextPath(readQuery().next, user));
  }, [status, user, router]);

  async function onSubmit(values: LoginValues) {
    setError(null);
    let otp: string | undefined;
    if (needsOtp) {
      const parsed = otpSchema.safeParse(values.otp ?? "");
      if (!parsed.success) {
        setFieldError("otp", { message: parsed.error.issues[0]?.message });
        return;
      }
      otp = parsed.data;
    }
    try {
      const result = await login({ email: values.email, password: values.password, otp });
      if (result.status === "otp-required") {
        setNeedsOtp(true);
        return;
      }
      if (result.status === "otp-invalid") {
        setFieldError("otp", { message: "That code isn't valid or was already used. Wait for the next one." });
        return;
      }
      router.replace(safeNextPath(readQuery().next, result.user));
    } catch (err) {
      setError(toErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <AnimatePresence initial={false}>
        {notice && (
          <motion.p
            role="status"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden rounded-xl bg-amber-soft px-4 py-3 text-sm text-amber-ink ring-1 ring-inset ring-amber/40"
          >
            {notice}
          </motion.p>
        )}
      </AnimatePresence>
      {error && <ErrorState message={error} />}

      <AnimatePresence mode="wait" initial={false}>
        {!needsOtp ? (
          <motion.div
            key="credentials"
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="space-y-5"
          >
            <Field name="email" label="Email" error={errors.email?.message}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                inputMode="email"
                placeholder="you@example.org"
                {...register("email")}
                aria-invalid={!!errors.email}
                aria-describedby={describedBy("email", errors.email?.message)}
              />
            </Field>
            <Field name="password" label="Password" error={errors.password?.message}>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  className="pr-12"
                  aria-invalid={!!errors.password}
                  aria-describedby={describedBy("password", errors.password?.message)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-1.5 top-[calc(50%+3px)] grid size-9 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-sunken hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
            </Field>
          </motion.div>
        ) : (
          <motion.div
            key="otp"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.24, ease: EASE_OUT }}
            className="space-y-5"
          >
            <div className="flex gap-3 rounded-2xl bg-brand-50 p-4 ring-1 ring-inset ring-brand-100">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden />
              <p className="text-sm leading-relaxed text-brand-900">Two-factor sign-in is on for this account. Open your authenticator app and enter the current code.</p>
            </div>
            <Field name="otp" label="6-digit code" error={errors.otp?.message}>
              <Input
                id="otp"
                autoFocus
                autoComplete="one-time-code"
                inputMode="numeric"
                placeholder="123 456"
                maxLength={7}
                {...register("otp")}
                className="text-center text-xl font-semibold tracking-[0.35em] tabular-nums"
                aria-invalid={!!errors.otp}
                aria-describedby={describedBy("otp", errors.otp?.message)}
              />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <Button type="submit" size="lg" loading={isSubmitting} className="w-full" icon={<KeyRound className="size-4" aria-hidden />}>
        {needsOtp ? "Verify and sign in" : "Sign in"}
      </Button>

      {needsOtp ? (
        <button
          type="button"
          onClick={() => setNeedsOtp(false)}
          className="mx-auto flex items-center gap-1.5 rounded-lg text-sm font-medium text-muted transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden /> Use a different account
        </button>
      ) : (
        <p className="text-center text-[0.8125rem] leading-relaxed text-muted">
          Accounts are created by your health team&apos;s administrator. Lost your authenticator? Ask them to reset two-factor sign-in.
        </p>
      )}
    </form>
  );
}
