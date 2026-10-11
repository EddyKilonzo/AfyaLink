"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LogOut, ShieldCheck, ShieldOff, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { QrCode } from "@/components/qr-code";
import { Badge, Button, describedBy, Field, Input, PageHeader, Panel, ServerErrors } from "@/components/ui";
import { useConfirm } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { changePasswordSchema, otpSchema, type ChangePasswordValues } from "@/features/auth/schemas";
import { useSync } from "@/features/sync/sync-context";
import { formatDateTime, initials, plural } from "@/lib/format";
import { ROLE_LABELS } from "@/types";
import { useChangePassword, useLogoutEverywhere, useMfa } from "./hooks";

export function SettingsScreen() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Your account and how you sign in." />
      <div className="space-y-5">
        <Panel className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <span className="grid size-16 shrink-0 place-items-center rounded-[20px] bg-brand-600 text-xl font-semibold text-white shadow-[var(--shadow-md)]">
            {initials(user.fullName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-h3 text-ink">{user.fullName}</p>
            <p className="truncate text-sm text-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="brand">{ROLE_LABELS[user.role]}</Badge>
              <Badge tone={user.mfaEnabled ? "success" : "neutral"} icon={user.mfaEnabled ? <ShieldCheck aria-hidden /> : <ShieldOff aria-hidden />}>
                Two-factor {user.mfaEnabled ? "on" : "off"}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted sm:text-right">
            Last sign-in
            <br />
            <span className="font-medium text-ink">{formatDateTime(user.lastLoginAt)}</span>
          </p>
        </Panel>

        <ChangePasswordSection />
        <MfaSection enabled={user.mfaEnabled} />
        <SessionsSection />
      </div>
    </div>
  );
}

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Panel className="p-5 sm:p-6">
      <div className="grid gap-5 md:grid-cols-[13rem_1fr] md:gap-8">
        <div>
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100">{icon}</span>
          <h2 className="mt-3 text-h3">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </Panel>
  );
}

function ChangePasswordSection() {
  const change = useChangePassword();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema) });

  async function onSubmit(values: ChangePasswordValues) {
    if (await change.run(values.currentPassword, values.newPassword)) {
      reset();
      toast.success("Password changed", "Your other devices have been signed out.");
    }
  }

  return (
    <Section icon={<KeyRound className="size-5" aria-hidden />} title="Password" description="Changing it signs you out on every other device.">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
        <ServerErrors error={change.error} fieldErrors={change.fieldErrors} />
        <Field name="currentPassword" label="Current password" error={errors.currentPassword?.message}>
          <Input
            id="currentPassword"
            type="password"
            autoComplete="current-password"
            {...register("currentPassword")}
            aria-invalid={!!errors.currentPassword}
            aria-describedby={describedBy("currentPassword", errors.currentPassword?.message)}
          />
        </Field>
        <Field name="newPassword" label="New password" hint="At least 10 characters, with a letter and a number." error={errors.newPassword?.message}>
          <Input
            id="newPassword"
            type="password"
            autoComplete="new-password"
            {...register("newPassword")}
            aria-invalid={!!errors.newPassword}
            aria-describedby={describedBy("newPassword", errors.newPassword?.message, true)}
          />
        </Field>
        <Field name="confirmPassword" label="Confirm new password" error={errors.confirmPassword?.message}>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register("confirmPassword")}
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={describedBy("confirmPassword", errors.confirmPassword?.message)}
          />
        </Field>
        <Button type="submit" loading={change.pending} className="justify-self-start max-sm:w-full">
          Change password
        </Button>
      </form>
    </Section>
  );
}

function MfaSection({ enabled }: { enabled: boolean }) {
  const { setup, enable, disable } = useMfa();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [secret, setSecret] = useState<{ secret: string; otpauthUrl: string } | null>(null);

  function validCode(): string | null {
    const parsed = otpSchema.safeParse(code);
    setCodeError(parsed.success ? null : (parsed.error.issues[0]?.message ?? "Enter the 6-digit code."));
    return parsed.success ? parsed.data : null;
  }

  async function start() {
    const result = await setup.run(password);
    if (result) {
      setSecret(result);
      setPassword("");
    }
  }

  async function confirmCode() {
    const otp = validCode();
    if (otp && (await enable.run(otp))) {
      setSecret(null);
      setCode("");
      toast.success("Two-factor sign-in is on", "You'll need your authenticator app each time you sign in.");
    }
  }

  async function turnOff() {
    const otp = validCode();
    if (otp && (await disable.run(password, otp))) {
      setPassword("");
      setCode("");
      toast.success("Two-factor sign-in is off");
    }
  }

  const error = setup.error ?? enable.error ?? disable.error;
  const codeInput = (
    <Field name="mfa-code" label="6-digit code" error={codeError ?? undefined}>
      <Input
        id="mfa-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123 456"
        maxLength={7}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        className="max-w-48 text-center text-lg font-semibold tracking-[0.3em] tabular-nums"
        aria-invalid={!!codeError}
        aria-describedby={describedBy("mfa-code", codeError ?? undefined)}
      />
    </Field>
  );

  return (
    <Section
      icon={<Smartphone className="size-5" aria-hidden />}
      title="Two-factor sign-in"
      description="Adds a code from an authenticator app to every sign-in. Recommended for administrators."
    >
      <div className="grid gap-4">
        <ServerErrors error={error} />
        {enabled ? (
          <>
            <p className="flex items-center gap-2 text-sm font-medium text-synced">
              <ShieldCheck className="size-4" aria-hidden /> Two-factor sign-in is on.
            </p>
            <Field name="mfa-password" label="Password">
              <Input id="mfa-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {codeInput}
            <Button variant="danger" loading={disable.pending} onClick={() => void turnOff()} disabled={!password} className="justify-self-start max-sm:w-full">
              Turn off two-factor
            </Button>
          </>
        ) : secret ? (
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="justify-self-center rounded-2xl bg-white p-2 shadow-[var(--shadow-ring),var(--shadow-sm)] sm:justify-self-start">
              <QrCode value={secret.otpauthUrl} label="QR code for your authenticator app" size={168} />
            </div>
            <div className="grid gap-4">
              <p className="text-sm leading-relaxed text-muted">Scan the code with your authenticator app, then enter the 6-digit code it shows.</p>
              <details className="text-sm">
                <summary className="cursor-pointer font-medium text-brand-700">Can&apos;t scan? Enter the key manually</summary>
                <code className="mt-2 block break-all rounded-xl bg-sunken p-3 text-xs tracking-wider text-ink">{secret.secret}</code>
                <p className="mt-1 text-xs text-muted">Time-based, 6 digits, every 30 seconds.</p>
              </details>
              {codeInput}
              <div className="flex flex-wrap gap-2">
                <Button loading={enable.pending} onClick={() => void confirmCode()}>
                  Turn on two-factor
                </Button>
                <Button variant="ghost" onClick={() => setSecret(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted">Confirm your password to start. You&apos;ll scan a QR code next.</p>
            <Field name="mfa-start-password" label="Password">
              <Input id="mfa-start-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            <Button loading={setup.pending} onClick={() => void start()} disabled={!password} className="justify-self-start max-sm:w-full">
              Set up two-factor
            </Button>
          </>
        )}
      </div>
    </Section>
  );
}

function SessionsSection() {
  const logoutAll = useLogoutEverywhere();
  const router = useRouter();
  const confirm = useConfirm();
  const { counts } = useSync();
  const unsynced = counts.pending + counts.failed + counts.syncing;

  async function onClick() {
    const ok = await confirm({
      title: "Sign out on every device?",
      description: (
        <>
          Every session of your account ends immediately, including this one.
          {unsynced > 0 && ` ${plural(unsynced, "report")} on this device haven't synced yet; they stay here until you sign in again.`}
        </>
      ),
      confirmLabel: "Sign out everywhere",
      tone: "danger",
    });
    if (ok && (await logoutAll.run())) router.replace("/login");
  }

  return (
    <Section icon={<LogOut className="size-5" aria-hidden />} title="Sessions" description="Lost a phone? End every session of your account at once.">
      <div className="grid gap-3">
        <ServerErrors error={logoutAll.error} />
        <Button variant="outline" loading={logoutAll.pending} onClick={() => void onClick()} className="justify-self-start max-sm:w-full">
          Sign out everywhere
        </Button>
      </div>
    </Section>
  );
}
