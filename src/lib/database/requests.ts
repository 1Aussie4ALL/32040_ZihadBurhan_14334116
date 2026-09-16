import "server-only";
import { prisma } from "./prisma";
import { writeAuditLog } from "./audit";
import { runTriage } from "@/lib/triage/engine";
import { assessAppointmentTiming } from "@/lib/triage/timing";
import { getRelevantQuestions } from "@/lib/questions/engine";
import { validateAnswers } from "@/lib/validation/answers";
import { calculateAgeYears } from "@/lib/triage/doctorMatch";
import { URGENCY_ORDER } from "@/types";
import type { AnswerMap, ComplaintCategory, PatientDetailsInput, TriageResult, UrgencyLevel } from "@/types";

export class SlotUnavailableError extends Error {
  constructor() {
    super("That appointment time is no longer available. Please choose another.");
    this.name = "SlotUnavailableError";
  }
}

export interface SubmitAppointmentRequestInput {
  patient: PatientDetailsInput;
  category: ComplaintCategory;
  concernText: string;
  answers: AnswerMap;
  selectedDoctorId: string;
  selectedSlotId: string;
  insuranceType: string | null;
  proceedDespiteWarning: boolean;
}

export interface SubmitAppointmentRequestResult {
  appointmentRequestId: string;
  triageResult: TriageResult;
}

/**
 * Runs the full triage pipeline and, in a single transaction, persists the patient,
 * request, structured answers, triage assessment, triggered safety rules, and audit
 * trail — then marks the chosen slot as booked. Triage is recomputed server-side
 * from the submitted category/concern/answers (never from a client-supplied
 * result), so a tampered client cannot force a lower urgency into the database.
 */
export async function submitAppointmentRequest(
  input: SubmitAppointmentRequestInput,
): Promise<SubmitAppointmentRequestResult> {
  // Defence in depth: the server action already validated these, but this function
  // recomputes triage itself, so it re-scopes the answers rather than assuming a
  // caller cleaned them. Anything not belonging to this category's question set is
  // dropped before it can reach a safety rule or be stored against the request.
  const { answers } = validateAnswers(input.category, input.answers);
  const triageResult = await runTriage(input.category, input.concernText, answers);

  const slot = await prisma.appointmentSlot.findUnique({ where: { id: input.selectedSlotId } });
  if (!slot || slot.isBooked || slot.doctorId !== input.selectedDoctorId) {
    throw new SlotUnavailableError();
  }

  const timing = assessAppointmentTiming(triageResult.urgencyLevel, slot.startTime);
  const relevantQuestions = getRelevantQuestions(input.category, answers);
  const questionById = new Map(relevantQuestions.map((q) => [q.questionId, q]));

  const appointmentRequestId = await prisma.$transaction(async (tx) => {
    const claimed = await tx.appointmentSlot.updateMany({
      where: { id: input.selectedSlotId, isBooked: false },
      data: { isBooked: true },
    });
    if (claimed.count === 0) {
      throw new SlotUnavailableError();
    }

    const patient = await tx.patient.create({
      data: {
        firstName: input.patient.firstName,
        lastName: input.patient.lastName,
        dateOfBirth: new Date(input.patient.dateOfBirth),
        sex: input.patient.sex ?? null,
        phone: input.patient.phone,
        email: input.patient.email,
      },
    });

    const request = await tx.appointmentRequest.create({
      data: {
        patientId: patient.id,
        category: input.category,
        concernText: input.concernText,
        status: "submitted",
        selectedDoctorId: input.selectedDoctorId,
        appointmentSlotId: input.selectedSlotId,
        insuranceType: input.insuranceType,
        timingAppropriate: timing.appropriate,
        timingMessage: timing.message,
        proceedDespiteWarning: input.proceedDespiteWarning,
      },
    });

    for (const [questionId, value] of Object.entries(answers)) {
      const question = questionById.get(questionId);
      if (!question) continue;
      await tx.patientAnswer.create({
        data: {
          appointmentRequestId: request.id,
          questionId,
          questionText: question.questionText,
          answerValue: JSON.stringify(value),
        },
      });
    }

    await tx.triageAssessment.create({
      data: {
        appointmentRequestId: request.id,
        urgencyLevel: triageResult.urgencyLevel,
        reasoningSummary: JSON.stringify(triageResult.reasoningSummary),
        triggeredRules: JSON.stringify(triageResult.triggeredRules.map((r) => r.ruleId)),
        riskIndicators: JSON.stringify(triageResult.riskIndicators),
        missingInformation: JSON.stringify(triageResult.missingInformation),
        recommendedTimeframe: triageResult.recommendedTimeframe,
        recommendedClinicianType: triageResult.recommendedClinicianType,
        aiSummary: triageResult.aiSummary,
        aiConfidence: triageResult.aiConfidence,
        finalSource: triageResult.finalSource,
        requiresHumanReview: true,
      },
    });

    for (const rule of triageResult.triggeredRules) {
      await tx.safetyRuleResult.create({
        data: {
          appointmentRequestId: request.id,
          ruleId: rule.ruleId,
          triggered: true,
          severity: rule.severity,
          explanation: rule.explanation,
        },
      });
    }

    await writeAuditLog(tx, {
      appointmentRequestId: request.id,
      eventType: "appointment_request_created",
      description: `Appointment request submitted for category "${input.category}".`,
      actor: "patient",
    });

    if (triageResult.triggeredRules.length > 0) {
      await writeAuditLog(tx, {
        appointmentRequestId: request.id,
        eventType: "red_flag_detected",
        description: `${triageResult.triggeredRules.length} deterministic safety rule(s) triggered: ${triageResult.triggeredRules
          .map((r) => r.ruleId)
          .join(", ")}.`,
        metadata: triageResult.triggeredRules,
      });
    }

    await writeAuditLog(tx, {
      appointmentRequestId: request.id,
      eventType: triageResult.finalSource === "ai_unavailable_fallback" ? "ai_assessment_unavailable" : "ai_assessment_generated",
      description:
        triageResult.finalSource === "ai_unavailable_fallback"
          ? "AI assessment was unavailable; result is based on deterministic safety rules only."
          : `AI assessment generated (confidence ${(triageResult.aiConfidence * 100).toFixed(0)}%).`,
    });

    await writeAuditLog(tx, {
      appointmentRequestId: request.id,
      eventType: "final_urgency_assigned",
      description: `Final urgency assigned: ${triageResult.urgencyLevel} (source: ${triageResult.finalSource}).`,
    });

    if (!timing.appropriate) {
      await writeAuditLog(tx, {
        appointmentRequestId: request.id,
        eventType: "appointment_timing_warning_shown",
        description: timing.message ?? "Appointment timing warning shown to patient.",
      });
      if (input.proceedDespiteWarning) {
        await writeAuditLog(tx, {
          appointmentRequestId: request.id,
          eventType: "appointment_timing_warning_overridden",
          description: "Patient chose to continue with the originally selected appointment time.",
          actor: "patient",
        });
      }
    }

    return request.id;
  });

  return { appointmentRequestId, triageResult };
}

export interface QueueFilters {
  urgency?: UrgencyLevel;
  reviewed?: boolean;
}

export async function getClinicianQueue(filters: QueueFilters = {}) {
  const requests = await prisma.appointmentRequest.findMany({
    include: {
      patient: true,
      triageAssessment: true,
      clinicianReview: true,
      selectedDoctor: true,
      appointmentSlot: true,
    },
    orderBy: { createdAt: "asc" },
  });

  let filtered = requests;
  if (filters.urgency) {
    filtered = filtered.filter((r) => (r.clinicianReview?.overrideUrgency ?? r.triageAssessment?.urgencyLevel) === filters.urgency);
  }
  if (filters.reviewed !== undefined) {
    filtered = filtered.filter((r) => Boolean(r.clinicianReview?.reviewed) === filters.reviewed);
  }

  filtered.sort((a, b) => {
    const urgencyA = (a.clinicianReview?.overrideUrgency ?? a.triageAssessment?.urgencyLevel ?? "InsufficientInformation") as UrgencyLevel;
    const urgencyB = (b.clinicianReview?.overrideUrgency ?? b.triageAssessment?.urgencyLevel ?? "InsufficientInformation") as UrgencyLevel;
    const orderDiff = URGENCY_ORDER[urgencyB] - URGENCY_ORDER[urgencyA];
    if (orderDiff !== 0) return orderDiff;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  return filtered;
}

export async function getRequestDetail(id: string) {
  return prisma.appointmentRequest.findUnique({
    where: { id },
    include: {
      patient: true,
      answers: true,
      triageAssessment: true,
      safetyRuleResults: true,
      clinicianReview: { include: { clinician: true } },
      selectedDoctor: true,
      appointmentSlot: true,
      auditLogs: { orderBy: { createdAt: "asc" } },
    },
  });
}

export interface ClinicianReviewInput {
  requestId: string;
  clinicianId: string;
  overrideUrgency?: UrgencyLevel | null;
  overrideReason?: string;
  note?: string;
  markReviewed?: boolean;
}

export async function submitClinicianReview(input: ClinicianReviewInput) {
  const request = await prisma.appointmentRequest.findUnique({
    where: { id: input.requestId },
    include: { triageAssessment: true, clinicianReview: true },
  });
  if (!request) throw new Error("Appointment request not found.");

  const isOverride =
    Boolean(input.overrideUrgency) && input.overrideUrgency !== request.triageAssessment?.urgencyLevel;

  await prisma.$transaction(async (tx) => {
    await tx.clinicianReview.upsert({
      where: { appointmentRequestId: input.requestId },
      create: {
        appointmentRequestId: input.requestId,
        clinicianId: input.clinicianId,
        reviewed: input.markReviewed ?? false,
        overrideUrgency: input.overrideUrgency ?? null,
        overrideReason: input.overrideReason ?? null,
        note: input.note ?? null,
        reviewedAt: input.markReviewed ? new Date() : null,
      },
      update: {
        clinicianId: input.clinicianId,
        reviewed: input.markReviewed ?? undefined,
        overrideUrgency: input.overrideUrgency ?? null,
        overrideReason: input.overrideReason ?? null,
        note: input.note ?? null,
        reviewedAt: input.markReviewed ? new Date() : null,
      },
    });

    if (input.markReviewed) {
      await tx.appointmentRequest.update({ where: { id: input.requestId }, data: { status: "reviewed" } });
    }

    if (isOverride) {
      await writeAuditLog(tx, {
        appointmentRequestId: input.requestId,
        eventType: "clinician_overrode_classification",
        description: `Clinician overrode urgency from ${request.triageAssessment?.urgencyLevel} to ${input.overrideUrgency}. Reason: ${input.overrideReason || "(none provided)"}`,
        actor: input.clinicianId,
      });
    }

    if (input.markReviewed) {
      await writeAuditLog(tx, {
        appointmentRequestId: input.requestId,
        eventType: "clinician_reviewed",
        description: "Clinician marked this request as reviewed.",
        actor: input.clinicianId,
      });
    }
  });
}

export { calculateAgeYears };
