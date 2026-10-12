"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { Button, Field, Input, Panel, PanelHeader, ServerErrors } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { profileSchema, type ProfileValues } from "@/features/auth/schemas";
import { useUpdateProfile } from "./hooks";

/** Lets a volunteer change their display name and phone without signing in again. */
export function ProfileSection() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: user ? { fullName: user.fullName, phone: user.phone ?? "" } : undefined,
  });

  async function onSubmit(values: ProfileValues) {
    if (await update.run(values)) {
      reset(values);
      toast.success("Profile updated");
    }
  }

  return (
    <Panel>
      <PanelHeader title="Profile" description="How your name and phone appear to your area's team." />
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 px-5 pb-5 pt-4 sm:px-6">
        <ServerErrors error={update.error} fieldErrors={update.fieldErrors} />
        <Field name="fullName" label="Full name" error={errors.fullName?.message}>
          <Input id="fullName" {...register("fullName")} />
        </Field>
        <Field name="phone" label="Phone" optional error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+2547…" {...register("phone")} />
        </Field>
        <Button type="submit" loading={update.pending} disabled={!isDirty} icon={<Save className="size-4" aria-hidden />}>
          Save changes
        </Button>
      </form>
    </Panel>
  );
}