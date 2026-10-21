import type { z } from "zod";
import { getPatientDetailsErrors } from "./patientDetails";

// The final submit re-validates the whole booking. When that fails, the patient
// used to see one generic sentence with no idea which field or step was at fault.
// This maps each failure to the step it lives on and the DOM id of the field, so
// the wizard can say exactly what is wrong and take the patient straight to it.

export const BOOKING_STEP_NAMES = {
  1: "Your details",
  2: "Your concern",
  3: "Questions",
  5: "Doctor",
  6: "Appointment",
} as const;

export type BookingStep = keyof typeof BOOKING_STEP_NAMES;

export interface BookingFieldError {
  step: BookingStep;
  /** DOM id of the field (or field group) to highlight on that step. */
  fieldId: string;
  message: string;
}

export const INVALID_ANSWERS_ERROR: BookingFieldError = {
  step: 3,
  fieldId: "question-input",
  message: "Some of your answers couldn't be read. Please go back through the questions and answer them again.",
};

export function explainBookingErrors(input: unknown, error: z.ZodError): BookingFieldError[] {
  const data = (typeof input === "object" && input !== null ? input : {}) as Record<string, unknown>;
  const failed = new Set(error.issues.map((issue) => issue.path[0]));
  const errors: BookingFieldError[] = [];

  if (failed.has("patient")) {
    const patientErrors = getPatientDetailsErrors(data.patient);
    for (const [fieldId, message] of Object.entries(patientErrors)) {
      errors.push({ step: 1, fieldId, message });
    }
    if (errors.length === 0) {
      errors.push({ step: 1, fieldId: "firstName", message: "Your details are missing. Please fill them in again." });
    }
  }
  if (failed.has("category")) {
    errors.push({
      step: 2,
      fieldId: "category-options",
      message: "Please choose the category that best fits your concern.",
    });
  }
  if (failed.has("concernText")) {
    const length = typeof data.concernText === "string" ? data.concernText.trim().length : 0;
    errors.push({
      step: 2,
      fieldId: "concernText",
      message:
        length > 1000
          ? `Your description is too long (${length} characters). Please keep it under 1000.`
          : "Please add a short description of your concern.",
    });
  }
  if (failed.has("answers")) errors.push(INVALID_ANSWERS_ERROR);
  if (failed.has("selectedDoctorId")) {
    errors.push({ step: 5, fieldId: "doctor-options", message: "Please choose a clinician." });
  }
  if (failed.has("selectedSlotId")) {
    errors.push({ step: 6, fieldId: "slot-options", message: "Please choose an appointment time." });
  }
  if (failed.has("insuranceType")) {
    errors.push({ step: 6, fieldId: "insurance-options", message: "Please choose one of the insurance options." });
  }
  if (errors.length === 0) {
    errors.push({
      step: 6,
      fieldId: "slot-options",
      message: "Something in your request couldn't be read. Please check your appointment details and try again.",
    });
  }

  return errors.sort((a, b) => a.step - b.step);
}
