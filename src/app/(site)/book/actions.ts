"use server";

import { runTriage } from "@/lib/triage/engine";
import { getAvailableSlots } from "@/lib/database/doctors";
import { submitAppointmentRequest, SlotUnavailableError } from "@/lib/database/requests";
import { concernSchema, answerMapSchema, submitBookingSchema } from "@/lib/validation/schemas";
import { validateAnswers } from "@/lib/validation/answers";
import type { AnswerMap, ComplaintCategory, TriageResult, AppointmentSlotView } from "@/types";

const INVALID_ANSWERS_MESSAGE =
  "Some of your answers couldn't be read. Please go back through the questions and answer them again.";

export async function assessTriageAction(
  category: ComplaintCategory,
  concernText: string,
  answers: AnswerMap,
): Promise<{ success: true; result: TriageResult } | { success: false; error: string }> {
  const parsed = concernSchema.safeParse({ category, concernText });
  const answersParsed = answerMapSchema.safeParse(answers);
  if (!parsed.success || !answersParsed.success) {
    return { success: false, error: "Please complete the required fields before continuing." };
  }

  // Answers must also fit the question bank that produced them — an out-of-range
  // scale or an option that was never offered is rejected, never coerced.
  const checked = validateAnswers(parsed.data.category, answersParsed.data as AnswerMap);
  if (checked.invalid.length > 0) {
    return { success: false, error: INVALID_ANSWERS_MESSAGE };
  }

  try {
    const result = await runTriage(parsed.data.category, parsed.data.concernText, checked.answers);
    return { success: true, result };
  } catch {
    return { success: false, error: "Something went wrong assessing your request. Please try again." };
  }
}

export async function getAvailableSlotsAction(
  doctorId: string,
): Promise<{ success: true; slots: AppointmentSlotView[] } | { success: false; error: string }> {
  if (!doctorId) return { success: false, error: "No doctor selected." };
  try {
    const slots = await getAvailableSlots(doctorId);
    return { success: true, slots };
  } catch {
    return { success: false, error: "Could not load appointment availability. Please try again." };
  }
}

export async function submitBookingAction(
  input: unknown,
): Promise<{ success: true; appointmentRequestId: string } | { success: false; error: string }> {
  const parsed = submitBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Some details are missing or invalid. Please review the form and try again." };
  }

  const checked = validateAnswers(parsed.data.category, parsed.data.answers as AnswerMap);
  if (checked.invalid.length > 0) {
    return { success: false, error: INVALID_ANSWERS_MESSAGE };
  }

  try {
    const { appointmentRequestId } = await submitAppointmentRequest({
      ...parsed.data,
      answers: checked.answers,
      insuranceType: parsed.data.insuranceType ?? null,
    });
    return { success: true, appointmentRequestId };
  } catch (error) {
    if (error instanceof SlotUnavailableError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Something went wrong submitting your appointment request. Please try again." };
  }
}
