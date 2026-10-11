"use client";

import { ArrowLeft, KeyRound, ShieldCheck, ShieldOff, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AsyncBoundary } from "@/components/async-boundary";
import { Badge, Button, DataList, Field, Panel, PanelHeader, Select, ServerErrors, Skeleton } from "@/components/ui";
import { useConfirm } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { passwordSchema } from "@/features/auth/schemas";
import { useLocations } from "@/features/locations/hooks";
import { formatDateTime, initials } from "@/lib/format";
import { isUuid } from "@/lib/security";
import { formatLocation } from "@/services/locations.service";
import { ROLE_LABELS, USER_ROLES, type User, type UserRole } from "@/types";
import { useResetMfa, useResetPassword, useUpdateUser, useUser } from "./hooks";
import { PasswordField } from "./password-field";

export function UserDetailScreen() {
  const { id } = useParams<{ id: string }>();
  const valid = isUuid(id);
  const user = useUser(valid ? id : undefined);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/users" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Users
      </Link>
      {!valid ? (
        <Panel className="p-6 text-sm text-error">This user link isn&apos;t valid.</Panel>
      ) : (
        <AsyncBoundary
          state={user}
          loading={
            <div className="space-y-4">
              <Skeleton className="h-20 w-full rounded-[var(--radius-xl)]" />
              <Skeleton className="h-64 w-full rounded-[var(--radius-xl)]" />
            </div>
          }
        >
          {(u) => <UserDetail user={u} onChange={user.reload} />}
        </AsyncBoundary>
      )}
    </div>
  );
}

function UserDetail({ user, onChange }: { user: User; onChange: () => void }) {
  const { user: me } = useAuth();
  const isSelf = me?.id === user.id;
  const { byId, data: locations } = useLocations();
  const update = useUpdateUser();
  const confirm = useConfirm();
  const toast = useToast();
  const location = user.locationId ? byId.get(user.locationId) : undefined;

  async function patch(changes: Parameters<typeof update.run>[1], message: string) {
    if (await update.run(user.id, changes)) {
      toast.success(message, user.fullName);
      onChange();
    }
  }

  async function changeRole(role: UserRole) {
    if (role === user.role) return;
    const ok = await confirm({
      title: `Make ${user.fullName} ${role === "ADMIN" ? "an administrator" : "a volunteer"}?`,
      description: "Their current sessions end and they'll need to sign in again.",
      confirmLabel: "Change role",
    });
    if (ok) await patch({ role }, "Role changed");
  }

  async function toggleActive() {
    if (user.isActive) {
      const ok = await confirm({
        title: `Deactivate ${user.fullName}?`,
        description: "They're signed out everywhere and can't sign in until reactivated. Their reports stay.",
        confirmLabel: "Deactivate account",
        tone: "danger",
      });
      if (!ok) return;
    }
    await patch({ isActive: !user.isActive }, user.isActive ? "Account deactivated" : "Account reactivated");
  }

  return (
    <div className="space-y-5">
      <Panel className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="grid size-16 shrink-0 place-items-center rounded-[20px] bg-brand-600 text-xl font-semibold text-white shadow-[var(--shadow-md)]">
          {initials(user.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-h1 break-words">{user.fullName}</h1>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={user.role === "ADMIN" ? "info" : "brand"}>{ROLE_LABELS[user.role]}</Badge>
            <Badge tone={user.isActive ? "success" : "neutral"}>{user.isActive ? "Active" : "Deactivated"}</Badge>
            <Badge tone={user.mfaEnabled ? "success" : "neutral"} icon={user.mfaEnabled ? <ShieldCheck aria-hidden /> : <ShieldOff aria-hidden />}>
              Two-factor {user.mfaEnabled ? "on" : "off"}
            </Badge>
          </div>
        </div>
      </Panel>

      <ServerErrors error={update.error} fieldErrors={update.fieldErrors} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Details" />
          <div className="px-5 pb-2 sm:px-6">
            <DataList
              rows={[
                ["Phone", user.phone],
                ["Area", location ? formatLocation(location) : user.locationId ? `Area #${user.locationId}` : null],
                ["Last sign-in", user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"],
              ]}
            />
          </div>
        </Panel>

        {isSelf ? (
          <Panel variant="sunken" className="p-5 text-sm text-muted sm:p-6">
            This is your account. Change your own password and two-factor settings in{" "}
            <Link href="/settings" className="font-semibold text-brand-700 underline-offset-4 hover:underline">
              Settings
            </Link>
            . You can&apos;t change your own role or deactivate yourself.
          </Panel>
        ) : (
          <Panel>
            <PanelHeader title="Access" />
            <div className="grid gap-4 px-5 pb-6 pt-4 sm:px-6">
              <Field name="role" label="Role">
                <Select id="role" value={user.role} onChange={(e) => void changeRole(e.target.value as UserRole)} disabled={update.pending}>
                  {USER_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field name="area" label="Assigned area">
                <Select
                  id="area"
                  value={user.locationId ?? ""}
                  onChange={(e) => void patch({ locationId: e.target.value === "" ? null : Number(e.target.value) }, "Area updated")}
                  disabled={update.pending || !locations}
                >
                  <option value="">None</option>
                  {locations?.map((l) => (
                    <option key={l.id} value={l.id}>
                      {formatLocation(l)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Panel>
        )}
      </div>

      {!isSelf && (
        <>
          <SecurityPanel user={user} onChange={onChange} />
          <DangerRow
            icon={user.isActive ? <UserX className="size-5" aria-hidden /> : <UserCheck className="size-5" aria-hidden />}
            title={user.isActive ? "Deactivate account" : "Reactivate account"}
            description={user.isActive ? "Signs them out everywhere and blocks sign-in. Their reports are kept." : "Lets them sign in again with their current password."}
            action={
              <Button variant={user.isActive ? "danger" : "primary"} loading={update.pending} onClick={() => void toggleActive()}>
                {user.isActive ? "Deactivate" : "Reactivate"}
              </Button>
            }
            danger={user.isActive}
          />
        </>
      )}
    </div>
  );
}

function SecurityPanel({ user, onChange }: { user: User; onChange: () => void }) {
  const resetPassword = useResetPassword();
  const resetMfa = useResetMfa();
  const confirm = useConfirm();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function doResetPassword() {
    const parsed = passwordSchema.safeParse(password);
    setPasswordError(parsed.success ? null : (parsed.error.issues[0]?.message ?? "Invalid password."));
    if (!parsed.success) return;
    const ok = await confirm({
      title: "Set a new password?",
      description: `${user.fullName} is signed out everywhere and must use the new password. Share it privately.`,
      confirmLabel: "Set password",
    });
    if (ok && (await resetPassword.run(user.id, password))) {
      setPassword("");
      toast.success("Password reset", "Share the new password privately.");
    }
  }

  async function doResetMfa() {
    const ok = await confirm({
      title: "Turn off two-factor sign-in?",
      description: "Use this when someone has lost their authenticator device. They're signed out everywhere and can set it up again.",
      confirmLabel: "Turn off two-factor",
      tone: "danger",
    });
    if (ok && (await resetMfa.run(user.id))) {
      toast.success("Two-factor turned off", user.fullName);
      onChange();
    }
  }

  return (
    <Panel>
      <PanelHeader title="Sign-in security" />
      <div className="grid gap-6 px-5 pb-6 pt-4 sm:px-6 lg:grid-cols-2">
        <div className="grid content-start gap-3">
          <Field name="new-password" label="Set a new password" error={passwordError ?? undefined} hint="Use the wand to generate a strong one.">
            <PasswordField id="new-password" value={password} currentValue={password} onChange={(e) => setPassword(e.target.value)} onGenerate={setPassword} />
          </Field>
          <ServerErrors error={resetPassword.error} />
          <Button variant="outline" loading={resetPassword.pending} disabled={!password} onClick={() => void doResetPassword()} icon={<KeyRound className="size-4" aria-hidden />} className="justify-self-start max-sm:w-full">
            Reset password
          </Button>
        </div>
        <div className="grid content-start gap-3 rounded-2xl bg-sunken p-4">
          <p className="text-sm font-semibold text-ink">Two-factor sign-in</p>
          <p className="text-sm text-muted">{user.mfaEnabled ? "On. Reset it only if they've lost their authenticator." : "Off. They can turn it on from their Settings page."}</p>
          <ServerErrors error={resetMfa.error} />
          {user.mfaEnabled && (
            <Button variant="outline" loading={resetMfa.pending} onClick={() => void doResetMfa()} icon={<ShieldOff className="size-4" aria-hidden />} className="justify-self-start">
              Reset two-factor
            </Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function DangerRow({ icon, title, description, action, danger }: { icon: ReactNode; title: string; description: string; action: ReactNode; danger: boolean }) {
  return (
    <Panel variant="outline" className={danger ? "border-failed/25 bg-failed-bg/40" : undefined}>
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:p-6">
        <span className={danger ? "grid size-10 shrink-0 place-items-center rounded-xl bg-failed-bg text-failed" : "grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600"}>{icon}</span>
        <div className="flex-1">
          <p className="text-h3">{title}</p>
          <p className="text-sm text-muted">{description}</p>
        </div>
        <span className="press">{action}</span>
      </div>
    </Panel>
  );
}
