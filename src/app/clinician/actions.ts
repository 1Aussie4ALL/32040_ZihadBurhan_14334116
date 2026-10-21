"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { loginClinician, logoutClinician, requireClinician } from "@/lib/auth/session";
import { clinicianLoginSchema, clinicianOverrideSchema } from "@/lib/validation/schemas";
import { submitClinicianReview, OverrideReasonRequiredError } from "@/lib/database/requests";
import { runAndPersistEvaluation } from "@/lib/evaluation/runner";
import type { EvaluationSummary } from "@/types";

export async function loginAction(
  email: string,
  password: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = clinicianLoginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid login details." };
  }
  const result = await loginClinician(parsed.data.email, parsed.data.password);
  if (!result.success) return { success: false, error: result.error };
  return { success: true };
}

export async function logoutAction(): Promise<void> {
  await logoutClinician();
  redirect("/clinician/login");
}

export async function submitReviewAction(
  input: unknown,
): Promise<{ success: true } | { success: false; error: string }> {
  const parsed = clinicianOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Please check the review form and try again." };
  }

  const clinician = await requireClinician();

  try {
    await submitClinicianReview({
      requestId: parsed.data.requestId,
      clinicianId: clinician.id,
      overrideUrgency: parsed.data.overrideUrgency ?? null,
      overrideReason: parsed.data.overrideReason,
      note: parsed.data.note,
      markReviewed: parsed.data.markReviewed,
    });
  } catch (error) {
    if (error instanceof OverrideReasonRequiredError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Could not save this review. Please try again." };
  }

  revalidatePath(`/clinician/requests/${parsed.data.requestId}`);
  revalidatePath("/clinician/dashboard");
  return { success: true };
}

export async function runEvaluationAction(): Promise<
  { success: true; summary: EvaluationSummary } | { success: false; error: string }
> {
  await requireClinician();
  try {
    const summary = await runAndPersistEvaluation();
    revalidatePath("/clinician/evaluation");
    return { success: true, summary };
  } catch {
    return { success: false, error: "Could not run the evaluation. Please try again." };
  }
}
