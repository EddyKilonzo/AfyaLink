import { z } from "zod";

/**
 * Client-side mirrors of backend validation (IsAcceptablePassword, login and
 * MFA DTOs). They give fast feedback only; the server re-validates everything.
 */

const utf8Bytes = (value: string) => new TextEncoder().encode(value).length;

export const passwordSchema = z
  .string()
  .min(10, "Use at least 10 characters.")
  .refine((v) => utf8Bytes(v) <= 72, "Password is too long.")
  .refine((v) => v === v.trim(), "Password cannot start or end with a space.")
  .refine((v) => /\p{L}/u.test(v), "Include at least one letter.")
  .refine((v) => /\d/.test(v), "Include at least one digit.");

export const otpSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, ""))
  .pipe(z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."));

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email.").email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  otp: z.string().optional(),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: "Passwords do not match.", path: ["confirmPassword"] })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password different from the current one.",
    path: ["newPassword"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

const PHONE = /^\+?[0-9]{7,15}$/;
const NAME = /^[\p{L}\p{M} .'-]+$/u;

/** The subset of the user record a volunteer can change themselves. */
export const profileSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "At least 2 characters.")
      .max(120)
      .regex(NAME, "Letters, spaces, apostrophes, dots and hyphens only."),
    phone: z
      .string()
      .trim()
      .optional()
      .refine((v) => !v || PHONE.test(v), "7–15 digits, optionally starting with +."),
  });
export type ProfileValues = z.infer<typeof profileSchema>;

export const userFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "At least 2 characters.")
    .max(120)
    .regex(NAME, "Letters, spaces, apostrophes, dots and hyphens only."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(160),
  phone: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || PHONE.test(v), "7–15 digits, optionally starting with +."),
  role: z.enum(["CHV", "ADMIN"]),
  locationId: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
  password: passwordSchema,
});
export type UserFormInput = z.input<typeof userFormSchema>;
export type UserFormValues = z.output<typeof userFormSchema>;
