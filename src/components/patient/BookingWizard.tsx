"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Card, Container } from "@/components/common/Card";
import { Button } from "@/components/common/Button";
import { StepIndicator } from "./StepIndicator";
import { DetailsForm } from "./DetailsForm";
import { ConcernForm } from "./ConcernForm";
import { QuestionFlow } from "./QuestionFlow";
import { AssessmentResult } from "./AssessmentResult";
import { DoctorPicker } from "./DoctorPicker";
import { AppointmentPicker } from "./AppointmentPicker";
import { assessTriageAction, submitBookingAction } from "@/app/(site)/book/actions";
import { calculateAgeYears } from "@/lib/triage/doctorMatch";
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function runAssessment() {
    if (!category) return;
    setIsAssessing(true);
    setAssessError(null);
    const res = await assessTriageAction(category, concernText, answers);
    setIsAssessing(false);
    if (res.success) {
      setTriageResult(res.result);
      setStep(4);
    } else {
      setAssessError(res.error);
    }
  }

  async function handleSubmit(slotId: string, insurance: InsuranceType | null, proceedDespiteWarning: boolean) {
    if (!category || !selectedDoctorId) return;
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
    } else {
      setSubmitError(res.error);
    }
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
            onNext={(details) => {
              setPatient(details);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <ConcernForm
            initialCategory={category}
            initialConcernText={concernText}
            onBack={() => setStep(1)}
            onNext={(c, text) => {
              setCategory(c);
              setConcernText(text);
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
              void runAssessment();
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
                  <Button onClick={() => void runAssessment()}>
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
            initialSlotId={null}
            initialInsurance={null}
            onBack={() => setStep(5)}
            onSubmit={handleSubmit}
            submitting={isSubmitting}
            submitError={submitError}
          />
        )}
      </Card>
    </Container>
  );
}
