import { z } from "zod";
import { AGE_GROUPS, REPORT_CATEGORIES, REPORT_SEVERITIES } from "@/types";

/** Client-side rules mirror backend CreateReportDto; the server re-validates everything. */
export const reportFormSchema = z
  .object({
    category: z.enum(REPORT_CATEGORIES, { message: "Choose a category." }),
    conditionName: z
      .string()
      .trim()
      .min(2, "Describe the condition in at least 2 characters.")
      .max(120, "Keep this under 120 characters."),
    severity: z.enum(REPORT_SEVERITIES, { message: "Choose a severity." }),
    casesCount: z.coerce
      .number({ message: "Enter a number." })
      .int("Use a whole number.")
      .min(1, "At least 1 case.")
      .max(10_000, "That number looks too large."),
    ageGroup: z.enum(AGE_GROUPS, { message: "Choose an age group." }),
    symptoms: z.string().max(600, "Too many symptoms listed.").optional(),
    notes: z.string().max(2000, "Notes must be under 2000 characters.").optional(),
    observedAt: z
      .string()
      .min(1, "When was this observed?")
      .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date and time.")
      .refine((v) => Date.parse(v) <= Date.now() + 5 * 60_000, "This cannot be in the future."),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
    message: "Location needs both latitude and longitude.",
    path: ["latitude"],
  });

export type ReportFormInput = z.input<typeof reportFormSchema>;
export type ReportFormValues = z.output<typeof reportFormSchema>;

export function parseSymptoms(raw: string | undefined): string[] | undefined {
  const list = (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20)
    .map((s) => s.slice(0, 60));
  return list.length ? list : undefined;
}

export const CONDITION_SUGGESTIONS = [
  "Malaria",
  "Acute watery diarrhoea",
  "Cholera (suspected)",
  "Measles (suspected)",
  "Pneumonia",
  "Tuberculosis (suspected)",
  "Moderate acute malnutrition",
  "Severe acute malnutrition",
  "Missed immunisation",
  "Missed antenatal visit",
  "Contaminated water source",
];
