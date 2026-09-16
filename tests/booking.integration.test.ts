import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  submitAppointmentRequest,
  submitClinicianReview,
  getClinicianQueue,
  getRequestDetail,
  SlotUnavailableError,
} from "@/lib/database/requests";
import { getAvailableSlots } from "@/lib/database/doctors";
import type { AnswerMap, PatientDetailsInput } from "@/types";

// End-to-end integration against a real SQLite database (created by tests/globalSetup.ts).
// This is the same code path the booking wizard's server actions call, so it covers
// what the unit tests deliberately mock out: the Prisma transaction, slot claiming
// under contention, JSON round-tripping of structured answers, and the audit trail.

const prisma = new PrismaClient();

const PATIENT: PatientDetailsInput = {
  firstName: "Demo",
  lastName: "Patient",
  dateOfBirth: "1985-04-12",
  sex: "prefer_not_to_say",
  phone: "0400 000 000",
  email: "demo.patient@example.invalid",
};

const CARDIAC_EMERGENCY_ANSWERS: AnswerMap = {
  core_duration: "under_24h",
  core_severity: 8,
  core_progression: "worsening",
  core_associated_symptoms: ["dizziness"],
  core_functional_impact: true,
  cv_chest_character: "tightness_pressure",
  cv_breathing_difficulty: false,
  cv_radiates: true,
  cv_sweating: true,
};

const ROUTINE_ANSWERS: AnswerMap = {
  core_duration: "over_4_weeks",
  core_severity: 2,
  core_progression: "same",
  core_associated_symptoms: ["none"],
  core_functional_impact: false,
  gen_reason: "check_up",
};

/** Grabs an unbooked slot for a doctor, preferring one far enough out to be flagged. */
async function takeSlot(doctorId: string, index = 0) {
  const slots = await getAvailableSlots(doctorId);
  const slot = slots[index];
  if (!slot) throw new Error(`No free slot ${index} for doctor ${doctorId}`);
  return slot;
}

const DOCTOR_ID = "dr-sarah-chen";

beforeAll(async () => {
  const doctor = await prisma.doctor.findFirst();
  if (!doctor) throw new Error("Test database was not seeded — check tests/globalSetup.ts");
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("appointment request submission (real database)", () => {
  it("persists the request, answers, triage assessment, safety rules and audit trail in one transaction", async () => {
    const doctor = await prisma.doctor.findFirstOrThrow();
    const slot = await takeSlot(doctor.id);

    const { appointmentRequestId, triageResult } = await submitAppointmentRequest({
      patient: PATIENT,
      category: "cardiovascular",
      concernText: "Sudden chest tightness spreading into my left arm with a cold sweat.",
      answers: CARDIAC_EMERGENCY_ANSWERS,
      selectedDoctorId: doctor.id,
      selectedSlotId: slot.id,
      insuranceType: "medicare",
      proceedDespiteWarning: true,
    });

    // The deterministic safety rule must have decided this, not the AI.
    expect(triageResult.urgencyLevel).toBe("Emergency");
    expect(triageResult.finalSource).toBe("safety_rule");
    expect(triageResult.requiresHumanReview).toBe(true);

    const detail = await getRequestDetail(appointmentRequestId);
    expect(detail).not.toBeNull();
    expect(detail!.triageAssessment?.urgencyLevel).toBe("Emergency");
    expect(detail!.patient.firstName).toBe("Demo");
    expect(detail!.insuranceType).toBe("medicare");

    // Structured answers survive the JSON round-trip with their types intact.
    const answerByQuestion = new Map(detail!.answers.map((a) => [a.questionId, JSON.parse(a.answerValue)]));
    expect(answerByQuestion.get("core_severity")).toBe(8);
    expect(answerByQuestion.get("cv_radiates")).toBe(true);
    expect(answerByQuestion.get("core_associated_symptoms")).toEqual(["dizziness"]);

    // Only triggered rules are stored, and the cardiac cluster is among them.
    expect(detail!.safetyRuleResults.length).toBeGreaterThan(0);
    expect(detail!.safetyRuleResults.every((r) => r.triggered)).toBe(true);
    expect(detail!.safetyRuleResults.map((r) => r.ruleId)).toContain("SR-002-CARDIAC-WARNING-CLUSTER");

    const events = detail!.auditLogs.map((l) => l.eventType);
    expect(events).toContain("appointment_request_created");
    expect(events).toContain("red_flag_detected");
    expect(events).toContain("ai_assessment_generated");
    expect(events).toContain("final_urgency_assigned");

    // Emergency always fails the timing check, and the patient continued anyway.
    expect(detail!.timingAppropriate).toBe(false);
    expect(events).toContain("appointment_timing_warning_shown");
    expect(events).toContain("appointment_timing_warning_overridden");
  });

  it("marks the chosen slot as booked and removes it from availability", async () => {
    const doctor = await prisma.doctor.findFirstOrThrow({ where: { id: { not: DOCTOR_ID } } });
    const slot = await takeSlot(doctor.id);

    await submitAppointmentRequest({
      patient: PATIENT,
      category: "general_consultation",
      concernText: "I would like to book my annual check-up.",
      answers: ROUTINE_ANSWERS,
      selectedDoctorId: doctor.id,
      selectedSlotId: slot.id,
      insuranceType: null,
      proceedDespiteWarning: false,
    });

    const stored = await prisma.appointmentSlot.findUniqueOrThrow({ where: { id: slot.id } });
    expect(stored.isBooked).toBe(true);

    const remaining = await getAvailableSlots(doctor.id);
    expect(remaining.map((s) => s.id)).not.toContain(slot.id);
  });

  it("rejects a second booking of the same slot rather than double-booking it", async () => {
    const doctor = await prisma.doctor.findFirstOrThrow();
    const slot = await takeSlot(doctor.id);

    await submitAppointmentRequest({
      patient: PATIENT,
      category: "general_consultation",
      concernText: "Annual check-up please.",
      answers: ROUTINE_ANSWERS,
      selectedDoctorId: doctor.id,
      selectedSlotId: slot.id,
      insuranceType: null,
      proceedDespiteWarning: false,
    });

    await expect(
      submitAppointmentRequest({
        patient: { ...PATIENT, firstName: "Second" },
        category: "general_consultation",
        concernText: "Annual check-up please.",
        answers: ROUTINE_ANSWERS,
        selectedDoctorId: doctor.id,
        selectedSlotId: slot.id,
        insuranceType: null,
        proceedDespiteWarning: false,
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("rejects a slot that does not belong to the selected doctor", async () => {
    const [doctorA, doctorB] = await prisma.doctor.findMany({ take: 2 });
    const slotForB = await takeSlot(doctorB.id);

    await expect(
      submitAppointmentRequest({
        patient: PATIENT,
        category: "general_consultation",
        concernText: "Annual check-up please.",
        answers: ROUTINE_ANSWERS,
        selectedDoctorId: doctorA.id,
        selectedSlotId: slotForB.id,
        insuranceType: null,
        proceedDespiteWarning: false,
      }),
    ).rejects.toBeInstanceOf(SlotUnavailableError);
  });

  it("does not store another category's stale answers against the request", async () => {
    // The wizard keeps answers when a patient goes back and changes category, so a
    // musculoskeletal submission can legitimately arrive carrying cardiac answers.
    const doctor = await prisma.doctor.findFirstOrThrow();
    const slot = await takeSlot(doctor.id);

    const { appointmentRequestId, triageResult } = await submitAppointmentRequest({
      patient: PATIENT,
      category: "musculoskeletal",
      concernText: "I rolled my ankle playing sport yesterday.",
      answers: {
        core_duration: "1_3_days",
        core_severity: 5,
        core_progression: "same",
        core_associated_symptoms: ["none"],
        core_functional_impact: true,
        msk_mechanism: "sports",
        msk_deformity: false,
        msk_weight_bearing: false,
        msk_numbness: false,
        // stale cardiovascular answers from an earlier pass through the wizard
        cv_radiates: true,
        cv_sweating: true,
      },
      selectedDoctorId: doctor.id,
      selectedSlotId: slot.id,
      insuranceType: null,
      proceedDespiteWarning: false,
    });

    expect(triageResult.urgencyLevel).not.toBe("Emergency");
    expect(triageResult.triggeredRules.map((r) => r.ruleId)).not.toContain(
      "SR-002-CARDIAC-WARNING-CLUSTER",
    );

    const detail = await getRequestDetail(appointmentRequestId);
    const storedIds = detail!.answers.map((a) => a.questionId);
    expect(storedIds).not.toContain("cv_radiates");
    expect(storedIds).not.toContain("cv_sweating");
    expect(storedIds).toContain("msk_mechanism");
  });
});

describe("clinician queue and review (real database)", () => {
  it("orders the queue by urgency, most urgent first", async () => {
    const queue = await getClinicianQueue();
    expect(queue.length).toBeGreaterThan(1);

    const urgencies = queue.map(
      (r) => r.clinicianReview?.overrideUrgency ?? r.triageAssessment?.urgencyLevel,
    );
    expect(urgencies[0]).toBe("Emergency");
  });

  it("records an override with its reason, marks the request reviewed, and audits both", async () => {
    const doctor = await prisma.doctor.findFirstOrThrow();
    const slot = await takeSlot(doctor.id);

    const { appointmentRequestId } = await submitAppointmentRequest({
      patient: PATIENT,
      category: "general_consultation",
      concernText: "Annual check-up please.",
      answers: ROUTINE_ANSWERS,
      selectedDoctorId: doctor.id,
      selectedSlotId: slot.id,
      insuranceType: null,
      proceedDespiteWarning: false,
    });

    const clinician = await prisma.clinician.findFirstOrThrow();

    await submitClinicianReview({
      requestId: appointmentRequestId,
      clinicianId: clinician.id,
      overrideUrgency: "Priority",
      overrideReason: "Known history warrants an earlier review than the system suggested.",
      note: "Called patient to confirm.",
      markReviewed: true,
    });

    const detail = await getRequestDetail(appointmentRequestId);
    expect(detail!.clinicianReview?.overrideUrgency).toBe("Priority");
    expect(detail!.clinicianReview?.reviewed).toBe(true);
    expect(detail!.clinicianReview?.reviewedAt).toBeInstanceOf(Date);
    expect(detail!.status).toBe("reviewed");

    const events = detail!.auditLogs.map((l) => l.eventType);
    expect(events).toContain("clinician_overrode_classification");
    expect(events).toContain("clinician_reviewed");

    // The override must be attributed to the clinician, not to "system".
    const overrideLog = detail!.auditLogs.find((l) => l.eventType === "clinician_overrode_classification");
    expect(overrideLog?.actor).toBe(clinician.id);
    expect(overrideLog?.description).toContain("Priority");

    // The original system assessment is preserved alongside the override.
    expect(detail!.triageAssessment?.urgencyLevel).toBe("Routine");
  });

  it("filters the queue by reviewed state", async () => {
    const reviewed = await getClinicianQueue({ reviewed: true });
    const unreviewed = await getClinicianQueue({ reviewed: false });

    expect(reviewed.length).toBeGreaterThan(0);
    expect(reviewed.every((r) => r.clinicianReview?.reviewed === true)).toBe(true);
    expect(unreviewed.every((r) => !r.clinicianReview?.reviewed)).toBe(true);
  });

  it("is idempotent when the same request is reviewed twice", async () => {
    const queue = await getClinicianQueue({ reviewed: false });
    const target = queue[0];
    const clinician = await prisma.clinician.findFirstOrThrow();

    await submitClinicianReview({
      requestId: target.id,
      clinicianId: clinician.id,
      note: "First pass.",
      markReviewed: false,
    });
    await submitClinicianReview({
      requestId: target.id,
      clinicianId: clinician.id,
      note: "Second pass.",
      markReviewed: true,
    });

    const reviews = await prisma.clinicianReview.findMany({ where: { appointmentRequestId: target.id } });
    expect(reviews).toHaveLength(1); // upserted, not duplicated
    expect(reviews[0].note).toBe("Second pass.");
    expect(reviews[0].reviewed).toBe(true);
  });

  it("throws for a review against a request that does not exist", async () => {
    await expect(
      submitClinicianReview({ requestId: "does-not-exist", clinicianId: "x", markReviewed: true }),
    ).rejects.toThrow(/not found/i);
  });
});
