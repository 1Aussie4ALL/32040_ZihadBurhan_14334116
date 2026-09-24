import { z } from "zod";
import { ALL_URGENCY_LEVELS } from "@/types";
import { emailSchema } from "./email";

// Server-side validation for every form boundary in the app (section 22). Client
// components may do lightweight inline checks for UX, but every server action
// re-validates with these schemas before touching the database.

export const complaintCategorySchema = z.enum([
  "respiratory",
  "cardiovascular",
  "abdominal",
  "musculoskeletal",
  "skin",
  "neurological",
  "mental_wellbeing",
  "fever_infection",
  "injury",
  "medication",
  "general_consultation",
  "other",
]);

export const urgencyLevelSchema = z.enum(ALL_URGENCY_LEVELS);

export const EARLIEST_DATE_OF_BIRTH = "1900-01-01";

// Australian mobile numbers only: 04 followed by 8 more digits. Spaces and hyphens
// are allowed for readability ("0412 345 678", "0412-345-678").
export const phoneSchema = z
  .string()
  .trim()
  .max(20, "Enter a valid mobile number")
  .regex(/^[0-9\s-]+$/, "Enter a valid mobile number")
  .refine((v) => /^04\d{8}$/.test(v.replace(/[\s-]/g, "")), "Enter a valid mobile number");

export const patientDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(80),
  lastName: z.string().trim().min(1, "Last name is required").max(80),
  dateOfBirth: z
    .string()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Enter a valid date of birth")
    .refine((v) => new Date(v) <= new Date(), "Date of birth cannot be in the future")
    .refine((v) => new Date(v) >= new Date(EARLIEST_DATE_OF_BIRTH), "Enter a valid date of birth"),
  sex: z.enum(["female", "male", "intersex", "prefer_not_to_say"]).optional(),
  phone: phoneSchema,
  email: emailSchema,
});

export const concernSchema = z.object({
  category: complaintCategorySchema,
  concernText: z
    .string()
    .trim()
    .min(3, "Please describe your concern in a few words")
    .max(1000, "Please keep this under 1000 characters"),
});

const answerValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]);
export const answerMapSchema = z.record(z.string(), answerValueSchema);

export const insuranceTypeSchema = z.enum(["medicare", "private", "self_funded", "unsure"]);

export const submitBookingSchema = z.object({
  patient: patientDetailsSchema,
  category: complaintCategorySchema,
  concernText: z.string().trim().min(3).max(1000),
  answers: answerMapSchema,
  selectedDoctorId: z.string().min(1, "Please choose a doctor"),
  selectedSlotId: z.string().min(1, "Please choose an appointment time"),
  insuranceType: insuranceTypeSchema.nullable().optional(),
  proceedDespiteWarning: z.boolean().default(false),
});

export type SubmitBookingInput = z.infer<typeof submitBookingSchema>;

export const clinicianLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const clinicianOverrideSchema = z.object({
  requestId: z.string().min(1),
  overrideUrgency: urgencyLevelSchema.nullable().optional(),
  overrideReason: z.string().trim().max(2000).optional(),
  note: z.string().trim().max(2000).optional(),
  markReviewed: z.boolean().optional(),
});
