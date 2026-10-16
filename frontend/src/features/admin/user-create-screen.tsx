"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { Button, describedBy, Field, FormSection, Input, PageHeader, Panel, Select, ServerErrors } from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import { userFormSchema, type UserFormInput, type UserFormValues } from "@/features/auth/schemas";
import { useLocations } from "@/features/locations/hooks";
import { formatLocation } from "@/services/locations.service";
import { ROLE_LABELS, USER_ROLES } from "@/types";
import { useCreateUser } from "./hooks";
import { PasswordField } from "./password-field";

export function UserCreateScreen() {
  const router = useRouter();
  const toast = useToast();
  const create = useCreateUser();
  const locations = useLocations();
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<UserFormInput, unknown, UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: { role: "CHV" },
  });
  const [role, password] = useWatch({ control, name: ["role", "password"] });

  async function onSubmit(values: UserFormValues) {
    const user = await create.run({ ...values, phone: values.phone || undefined });
    if (user) {
      toast.success("Account created", `${user.fullName} can now sign in with the password you set.`);
      router.push(`/admin/users/${user.id}`);
    }
  }

  const aria = (name: keyof UserFormInput, hint?: boolean) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": describedBy(name, errors[name]?.message, hint),
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/admin/users" className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Users
      </Link>
      <PageHeader title="Add a user" description="Create an account for a volunteer or another administrator." />

      <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate>
        <Panel className="p-5 sm:p-7">
          <div className="space-y-8">
            <ServerErrors error={create.error} fieldErrors={create.fieldErrors} />
            <FormSection title="Who they are">
              <Field name="fullName" label="Full name" required error={errors.fullName?.message}>
                <Input id="fullName" autoComplete="off" {...register("fullName")} {...aria("fullName")} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field name="email" label="Email" required error={errors.email?.message} hint="They sign in with this.">
                  <Input id="email" type="email" autoComplete="off" {...register("email")} {...aria("email", true)} />
                </Field>
                <Field name="phone" label="Phone" optional error={errors.phone?.message}>
                  <Input id="phone" type="tel" autoComplete="off" placeholder="+2547…" {...register("phone")} {...aria("phone")} />
                </Field>
              </div>
            </FormSection>

            <FormSection title="Access">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field name="role" label="Role" required error={errors.role?.message}>
                  <Select id="role" {...register("role")}>
                    {USER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  name="locationId"
                  label="Assigned area"
                  optional
                  error={errors.locationId?.message}
                  hint={role === "CHV" ? "Volunteers can only report in this area's county." : undefined}
                >
                  <Select id="locationId" {...register("locationId", { setValueAs: (v) => (v === "" ? undefined : Number(v)) })} {...aria("locationId", role === "CHV")}>
                    <option value="">None</option>
                    {locations.data?.map((l) => (
                      <option key={l.id} value={l.id}>
                        {formatLocation(l)}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              {role === "ADMIN" && (
                <p className="flex gap-2 rounded-xl bg-syncing-bg p-3 text-[0.8125rem] text-syncing">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                  Administrators can see every report and manage all accounts. Suggest they turn on two-factor sign-in.
                </p>
              )}
            </FormSection>

            <FormSection title="First password" description="Share it privately, in person or by phone. It's never emailed.">
              <Field name="password" label="Initial password" required error={errors.password?.message} hint="At least 10 characters with a letter and a number. Use the wand to generate one.">
                <PasswordField
                  id="password"
                  {...register("password")}
                  currentValue={password}
                  onGenerate={(value) => setValue("password", value, { shouldValidate: true, shouldDirty: true })}
                  {...aria("password", true)}
                />
              </Field>
            </FormSection>
          </div>
        </Panel>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => router.push("/admin/users")}>
            Cancel
          </Button>
          <Button type="submit" size="lg" loading={create.pending}>
            Create account
          </Button>
        </div>
      </form>
    </div>
  );
}
