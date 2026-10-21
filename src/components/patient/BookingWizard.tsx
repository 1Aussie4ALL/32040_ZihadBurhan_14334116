"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Card, Container } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { ValidationDialog, useValidationPrompt } from "@/components/common/ValidationPrompt";
import { StepIndicator } from "./StepIndicator";
import { DetailsForm } from "./DetailsForm";
import { ConcernForm } from "./ConcernForm";
import { QuestionFlow } from "./QuestionFlow";
import { AssessmentResult } from "./AssessmentResult";
import { DoctorPicker } from "./DoctorPicker";
import { AppointmentPicker } from "./AppointmentPicker";
import { assessTriageAction, submitBookingAction } from "@/app/(site)/book/actions";
import { calculateAgeYears } from "@/lib/triage/doctorMatch";
import { BOOKING_STEP_NAMES, type BookingFieldError } from "@/lib/validation/bookingErrors";
import type { PatientDetailsErrors } from "@/lib/validation/patientDetails";
import type { AnswerMap, ComplaintCategory, InsuranceType, PatientDetailsInput, TriageResult } from "@/types";

const EMPTY_PATIENT: PatientDetailsInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  sex: undefined,
  phone: "",
  email: "",
};

export function BookingWizard({
  initialCategory,
  initialDoctorId,
}: {
  initialCategory: ComplaintCategory | null;
  initialDoctorId: string | null;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [patient, setPatient] = useState<PatientDetailsInput>(EMPTY_PATIENT);
  const [category, setCategory] = useState<ComplaintCategory | null>(initialCategory);
  const [concernText, setConcernText] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [askedIds, setAskedIds] = useState<string[]>([]);

  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [isAssessing, setIsAssessing] = useState(false);
  const [assessError, setAssessError] = useState<string | null>(null);

  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(initialDoctorId);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [insuranceType, setInsuranceType] = useState<InsuranceType | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // When the final submit is rejected, these are the problems to show on the step
  // the patient is sent back to. If only their details were wrong, nothing that
  // feeds triage changed, so they can return straight to the appointment step.
  const [fixErrors, setFixErrors] = useState<BookingFieldError[]>([]);
  const [returnToAppointment, setReturnToAppointment] = useState(false);
  const prompt = useValidationPrompt();

  const errorsFor = (step: number) =>
    Object.fromEntries(fixErrors.filter((e) => e.step === step).map((e) => [e.fieldId, e.message]));

  // Takes the answers explicitly: when called straight after setAnswers(), the
  // `answers` state in this closure is still the previous render's value.
  async function runAssessment(currentAnswers: AnswerMap) {
    if (!category) return;
    // Step 4 holds the progress spinner and the error/retry view as well as the result.
    setStep(4);
    setIsAssessing(true);
    setAssessError(null);
    const res = await assessTriageAction(category, concernText, currentAnswers);
    setIsAssessing(false);
    if (res.success) {
      setTriageResult(res.result);
    } else {
      setAssessError(res.error);
    }
  }

  async function handleSubmit(slotId: string, insurance: InsuranceType | null, proceedDespiteWarning: boolean) {
    if (!category || !selectedDoctorId) return;
    setSelectedSlotId(slotId);
    setInsuranceType(insurance);
    setIsSubmitting(true);
    setSubmitError(null);
    const res = await submitBookingAction({
      patient,
      category,
      concernText,
      answers,
      selectedDoctorId,
      selectedSlotId: slotId,
      insuranceType: insurance,
      proceedDespiteWarning,
    });
    setIsSubmitting(false);
    if (res.success) {
      router.push(`/request/${res.appointmentRequestId}/confirmation`);
    } else if (res.fieldErrors?.length) {
      showSubmitProblems(res.fieldErrors);
    } else {
      setSubmitError(res.error);
    }
  }

  function showSubmitProblems(errors: BookingFieldError[]) {
    const target = errors[0].step; // sorted earliest step first
    prompt.report(
      errors.map((e) => ({ fieldId: e.fieldId, message: e.message, section: BOOKING_STEP_NAMES[e.step] })),
      {
        title: "We couldn't send your request yet",
        actionLabel: target === step ? "Show me" : `Go to ${BOOKING_STEP_NAMES[target]}`,
        beforeReveal: () => {
          setFixErrors(errors);
          setReturnToAppointment(errors.every((e) => e.step === 1));
          setStep(target);
        },
      },
    );
  }

  const ageYears = patient.dateOfBirth ? calculateAgeYears(new Date(patient.dateOfBirth)) : null;

  return (
    <Container className="py-10">
      <div className="mb-8">
        <StepIndicator currentStep={step} />
      </div>

      <Card className="mx-auto max-w-2xl p-6 sm:p-8">
        {step === 1 && (
          <DetailsForm
            value={patient}
            initialErrors={errorsFor(1) as PatientDetailsErrors}
            notice={
              returnToAppointment
                ? "Please fix the highlighted details. You'll go straight back to your appointment time afterwards."
                : undefined
            }
            onNext={(details) => {
              setPatient(details);
              setFixErrors([]);
              if (returnToAppointment) {
                setReturnToAppointment(false);
                setStep(6);
              } else {
                setStep(2);
              }
            }}
          />
        )}

        {step === 2 && (
          <ConcernForm
            initialCategory={category}
            initialConcernText={concernText}
            initialErrors={{
              category: errorsFor(2)["category-options"],
              concernText: errorsFor(2)["concernText"],
            }}
            onBack={() => setStep(1)}
            onNext={(c, text) => {
              setCategory(c);
              setConcernText(text);
              setFixErrors([]);
              setStep(3);
            }}
          />
        )}

        {step === 3 && category && (
          <QuestionFlow
            category={category}
            initialAnswers={answers}
            initialAskedIds={askedIds}
            onBack={() => setStep(2)}
            onComplete={(finalAnswers, finalAskedIds) => {
              setAnswers(finalAnswers);
              setAskedIds(finalAskedIds);
              void runAssessment(finalAnswers);
            }}
          />
        )}

        {step === 4 && (
          <div>
            {isAssessing && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <Loader2 className="animate-spin text-brand" size={28} aria-hidden="true" />
                <p className="text-sm text-muted">Running safety checks and AI-assisted assessment…</p>
              </div>
            )}
            {!isAssessing && assessError && (
              <div className="space-y-4 text-center">
                <p className="text-sm text-red-600">{assessError}</p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => setStep(3)}>
                    Back to questions
                  </Button>
                  <Button onClick={() => void runAssessment(answers)}>
                    <RotateCcw size={16} aria-hidden="true" /> Try again
                  </Button>
                </div>
              </div>
            )}
            {!isAssessing && !assessError && triageResult && (
              <AssessmentResult result={triageResult} onBack={() => setStep(3)} onNext={() => setStep(5)} />
            )}
          </div>
        )}

        {step === 5 && category && (
          <DoctorPicker
            category={category}
            ageYears={ageYears}
            initialDoctorId={selectedDoctorId}
            onBack={() => setStep(4)}
            onNext={(doctorId) => {
              if (doctorId !== selectedDoctorId) setSelectedSlotId(null);
              setSelectedDoctorId(doctorId);
              setStep(6);
            }}
          />
        )}

        {step === 6 && selectedDoctorId && triageResult && (
          <AppointmentPicker
            key={selectedDoctorId}
            doctorId={selectedDoctorId}
            urgencyLevel={triageResult.urgencyLevel}
            initialSlotId={selectedSlotId}
            initialInsurance={insuranceType}
            onBack={() => setStep(5)}
            onSubmit={handleSubmit}
            submitting={isSubmitting}
            submitError={submitError}
          />
        )}
      </Card>

      <ValidationDialog {...prompt} />
    </Container>
  );
}
