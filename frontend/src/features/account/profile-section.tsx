"use client";

import { Camera, Save, User as UserIcon, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Field, Input, Panel, PanelHeader, ServerErrors } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/features/auth/auth-context";
import { profileSchema, type ProfileValues } from "@/features/auth/schemas";
import { validateProfilePicture } from "@/lib/cloudinary";
import { useUpdateProfile } from "./hooks";

/** Lets a volunteer change their display name, phone, and profile picture without signing in again. */
export function ProfileSection() {
  const { user, updateProfilePicture } = useAuth();
  const update = useUpdateProfile();
  const toast = useToast();
  const [preview, setPreview] = useState<string | null>(user?.avatarUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useCallback((el: HTMLInputElement | null) => {
    if (el) el.value = "";
  }, []);

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

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationError = validateProfilePicture(file);
    if (validationError) {
      toast.error("Invalid image", validationError);
      return;
    }

    setUploading(true);
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      await updateProfilePicture(file);
      toast.success("Profile picture updated");
      // Keep the preview from the object URL; it will be replaced by the real URL on next render
    } catch (error) {
      toast.error("Upload failed", error instanceof Error ? error.message : "Could not upload image.");
      setPreview(user?.avatarUrl ?? null);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveAvatar() {
    setPreview(null);
    fileInputRef(null);
  }

  return (
    <Panel>
      <PanelHeader title="Profile" description="How your name and phone appear to your area's team." />
      <form method="post" onSubmit={handleSubmit(onSubmit)} className="grid gap-6 px-5 pb-5 pt-4 sm:px-6">
        {/* Profile Picture */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {preview ? (
                  <img
                    src={preview}
                    alt={`${user?.fullName}'s profile picture`}
                    className="size-24 rounded-full bg-sunken object-cover ring-2 ring-brand-100"
                  />
              ) : (
                <div className="size-24 rounded-full bg-brand-100 flex items-center justify-center ring-2 ring-brand-200">
                  <UserIcon className="size-10 text-brand-600" aria-hidden />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 size-8 rounded-full bg-brand-600 text-white flex items-center justify-center cursor-pointer hover:bg-brand-700 transition-colors ring-2 ring-background shadow-[var(--shadow-md)]"
                aria-label={preview ? "Change profile picture" : "Add profile picture"}
              >
                <Camera className="size-4" aria-hidden />
              </label>
            </div>
            <div className="min-w-0">
              <p className="text-h3 text-ink">{user?.fullName}</p>
              <p className="truncate text-sm text-muted">{user?.email}</p>
            </div>
          </div>
          {preview && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              icon={<X className="size-4" aria-hidden />}
              onClick={handleRemoveAvatar}
              disabled={uploading}
              className="shrink-0"
            >
              Remove
            </Button>
          )}
        </div>

        <input
          id="avatar-upload"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange}
          disabled={uploading}
          className="sr-only"
          ref={fileInputRef}
        />

        {uploading && (
          <div className="flex items-center gap-2 text-sm text-muted" role="status" aria-live="polite">
            <span className="size-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" aria-hidden />
            Uploading…
          </div>
        )}

        <hr className="border-muted/30" />

        {/* Profile Fields */}
        <ServerErrors error={update.error} fieldErrors={update.fieldErrors} />
        <Field name="fullName" label="Full name" error={errors.fullName?.message}>
          <Input id="fullName" {...register("fullName")} />
        </Field>
        <Field name="phone" label="Phone" optional error={errors.phone?.message}>
          <Input id="phone" type="tel" autoComplete="tel" placeholder="+2547…" {...register("phone")} />
        </Field>
        <Button type="submit" loading={update.pending} disabled={!isDirty && !preview} icon={<Save className="size-4" aria-hidden />}>
          Save changes
        </Button>
      </form>
    </Panel>
  );
}