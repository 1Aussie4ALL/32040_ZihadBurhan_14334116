import { EARLIEST_DATE_OF_BIRTH, patientDetailsSchema, phoneSchema } from "./schemas";
import { getEmailError } from "./email";
import type { PatientDetailsInput } from "@/types";

// The details step and the final server submit both run patientDetailsSchema, so
// the browser can't accept a value the server will later reject. Each helper below
// only turns a failure into a message that says what is actually wrong.

export type PatientDetailsErrors = Partial<Record<keyof PatientDetailsInput, string>>;

/** Display order, matching the form layout. */
export const PATIENT_FIELD_ORDER: (keyof PatientDetailsInput)[] = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "sex",
  "phone",
  "email",
];

const MOBILE_EXAMPLE = "e.g. 0412 345 678";

/** Returns a user-facing message for an invalid mobile number, or null when it is valid. */
export function getPhoneError(value: string): string | null {
  const phone = value.trim();
  if (!phone) return "Mobile number is required.";
  if (phoneSchema.safeParse(phone).success) return null;

  const compact = phone.replace(/[\s-]/g, "");
  if (/^(\+|00)?61/.test(compact) && compact.length > 4)
    return `Please enter your mobile starting with 04 instead of +61, ${MOBILE_EXAMPLE}.`;
  if (/[A-Za-z]/.test(phone)) return "Mobile number can't contain letters.";
  const badChar = [...phone].find((c) => !/[0-9\s-]/.test(c));
  if (badChar) return `Mobile number can't contain "${badChar}". Use digits and spaces only, ${MOBILE_EXAMPLE}.`;

  if (/^0[2378]/.test(compact)) return "That looks like a landline. Please enter a mobile number starting with 04.";
  if (compact.length >= 2 && !compact.startsWith("04")) return `Mobile number must start with 04, ${MOBILE_EXAMPLE}.`;

  const digits = compact.length;
  const count = `${digits} digit${digits === 1 ? "" : "s"}`;
  return digits < 10
    ? `Mobile number is too short (${count}). It should be 10 digits, ${MOBILE_EXAMPLE}.`
    : `Mobile number is too long (${count}). It should be 10 digits, ${MOBILE_EXAMPLE}.`;
}

function getDateOfBirthError(value: string): string {
  if (!value) return "Date of birth is required.";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Enter a valid date of birth.";
  if (date > new Date()) return "Date of birth can't be in the future.";
  if (date < new Date(EARLIEST_DATE_OF_BIRTH)) return "Date of birth is too far in the past. Check the year.";
  return "Enter a valid date of birth.";
}

function getNameError(label: string, value: string): string {
  return value.trim() ? `${label} must be 80 characters or fewer.` : `${label} is required.`;
}

const text = (v: unknown) => (typeof v === "string" ? v : "");

/**
 * Explains every invalid field. Accepts `unknown` because the server calls it on
 * untrusted submitted data as well as the browser calling it on form state.
 */
export function getPatientDetailsErrors(input: unknown): PatientDetailsErrors {
  const parsed = patientDetailsSchema.safeParse(input);
  if (parsed.success) return {};

  const d = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const failed = new Set(parsed.error.issues.map((issue) => issue.path[0]));
  const errors: PatientDetailsErrors = {};

  for (const field of PATIENT_FIELD_ORDER) {
    if (!failed.has(field)) continue;
    switch (field) {
      case "firstName":
        errors.firstName = getNameError("First name", text(d.firstName));
        break;
      case "lastName":
        errors.lastName = getNameError("Last name", text(d.lastName));
        break;
      case "dateOfBirth":
        errors.dateOfBirth = getDateOfBirthError(text(d.dateOfBirth));
        break;
      case "sex":
        errors.sex = "Please choose an option from the list.";
        break;
      case "phone":
        errors.phone = getPhoneError(text(d.phone)) ?? "Enter a valid mobile number.";
        break;
      case "email":
        errors.email = getEmailError(text(d.email)) ?? "Enter a valid email address.";
        break;
    }
  }
  return errors;
}
