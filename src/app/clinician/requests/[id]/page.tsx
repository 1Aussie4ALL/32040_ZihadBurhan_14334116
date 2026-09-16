import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin, CalendarDays, ShieldAlert, Info } from "lucide-react";
import { requireClinician } from "@/lib/auth/session";
import { getRequestDetail } from "@/lib/database/requests";
import { getDoctorById } from "@/data/doctors";
import { getQuestionById, formatAnswerValue } from "@/lib/questions/engine";
import { calculateAgeYears } from "@/lib/triage/doctorMatch";
import { Container, Card } from "@/components/common/Card";
import { UrgencyBadge } from "@/components/common/UrgencyBadge";
import { ReviewForm } from "@/components/clinician/ReviewForm";
import type { UrgencyLevel } from "@/types";

export const metadata: Metadata = { title: "Request Detail" };

export default async function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireClinician();
  const { id } = await params;
  const request = await getRequestDetail(id);
  if (!request || !request.triageAssessment) notFound();

  const triage = request.triageAssessment;
  const reasoningSummary: string[] = JSON.parse(triage.reasoningSummary);
  const riskIndicators: string[] = JSON.parse(triage.riskIndicators);
  const missingInformation: string[] = JSON.parse(triage.missingInformation);

  const doctor = request.selectedDoctorId ? getDoctorById(request.selectedDoctorId) : undefined;
  const age = calculateAgeYears(request.patient.dateOfBirth);
  const systemUrgency = triage.urgencyLevel as UrgencyLevel;
  const effectiveUrgency = (request.clinicianReview?.overrideUrgency ?? systemUrgency) as UrgencyLevel;

  const duration = getAnswerLabel(request.answers, "core_duration");
  const severity = getAnswerLabel(request.answers, "core_severity");
  const progression = getAnswerLabel(request.answers, "core_progression");
  const associated = getAnswerLabel(request.answers, "core_associated_symptoms");

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">Appointment request</p>
          <h1 className="text-2xl font-bold text-slate-900">
            {request.patient.firstName} {request.patient.lastName}
            <span className="ml-2 text-lg font-normal text-muted">{age} yrs</span>
          </h1>
          <p className="mt-1 font-mono text-xs text-muted">{request.id}</p>
        </div>
        <UrgencyBadge level={effectiveUrgency} size="lg" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">Pre-consultation summary</h2>
            <dl className="mt-4 space-y-4 text-sm">
              <SummaryRow label="Presenting concern" value={request.category.replace(/_/g, " ")} />
              <SummaryRow label="Patient description" value={request.concernText} />
              <SummaryRow label="Severity" value={severity ?? "Not provided"} />
              <SummaryRow label="Progression" value={progression ?? "Not provided"} />
              <SummaryRow label="Duration" value={duration ?? "Not provided"} />
              <SummaryRow label="Associated information" value={associated ?? "None reported"} />
              <SummaryRow
                label="Risk indicators"
                value={riskIndicators.length > 0 ? riskIndicators.join("; ") : "None identified"}
              />
              <SummaryRow label="Appointment triage" value={systemUrgency} />
              <SummaryRow label="Suggested review time" value={triage.recommendedTimeframe} />
              <SummaryRow
                label="Reasoning"
                value={reasoningSummary.length > 0 ? reasoningSummary.join(" ") : "No specific factors recorded."}
              />
              <SummaryRow
                label="Safety rule results"
                value={
                  request.safetyRuleResults.length > 0
                    ? request.safetyRuleResults.map((r) => `${r.ruleId} (${r.severity})`).join(", ")
                    : "No safety rule triggered."
                }
              />
              <SummaryRow
                label="AI confidence"
                value={`${(triage.aiConfidence * 100).toFixed(0)}% — confidence reflects available information, not clinical certainty.`}
              />
              <SummaryRow label="Human review" value="Required" />
            </dl>
          </Card>

          {request.safetyRuleResults.length > 0 && (
            <Card className="border-red-200 p-6">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-red-800">
                <ShieldAlert size={18} aria-hidden="true" /> Triggered deterministic safety rules
              </h2>
              <ul className="mt-3 space-y-2 text-sm text-red-900">
                {request.safetyRuleResults.map((r) => (
                  <li key={r.id} className="rounded-lg bg-red-50 p-3">
                    <p className="font-semibold">
                      {r.ruleId} — {r.severity.toUpperCase()}
                    </p>
                    <p className="mt-0.5">{r.explanation}</p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {missingInformation.length > 0 && (
            <Card className="p-6">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Info size={16} aria-hidden="true" /> Missing information noted by the AI assessment
              </h2>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {missingInformation.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">All patient responses</h2>
            <dl className="mt-4 space-y-3 text-sm">
              {request.answers.map((a) => {
                const question = getQuestionById(a.questionId);
                const value = JSON.parse(a.answerValue);
                return (
                  <div key={a.id} className="border-b border-border-subtle pb-3 last:border-0 last:pb-0">
                    <dt className="text-slate-600">{a.questionText}</dt>
                    <dd className="font-medium text-slate-900">
                      {question ? formatAnswerValue(question, value) : String(value)}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900">Audit trail</h2>
            <ul className="mt-3 space-y-2 text-xs text-muted">
              {request.auditLogs.map((log) => (
                <li key={log.id} className="flex gap-3">
                  <span className="shrink-0 font-mono">{new Date(log.createdAt).toLocaleTimeString("en-AU")}</span>
                  <span>
                    <strong className="text-slate-700">{log.eventType}</strong> — {log.description}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-800">Requested appointment</h2>
            {doctor && <p className="mt-2 font-medium text-slate-900">{doctor.name}</p>}
            {doctor && <p className="text-sm text-muted">{doctor.specialty}</p>}
            {request.appointmentSlot && (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                <CalendarDays size={15} className="text-brand" aria-hidden="true" />
                {new Date(request.appointmentSlot.startTime).toLocaleString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
            {doctor && (
              <p className="mt-2 flex items-start gap-2 text-xs text-muted">
                <MapPin size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {doctor.clinicLocation}
              </p>
            )}
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs">
              <p className="font-semibold text-slate-700">
                System considered this timing {request.timingAppropriate ? "appropriate" : "potentially too late"}.
              </p>
              {request.timingMessage && <p className="mt-1 text-muted">{request.timingMessage}</p>}
              {request.proceedDespiteWarning && (
                <p className="mt-1 text-amber-700">Patient chose to proceed despite the timing warning.</p>
              )}
            </div>
            {request.insuranceType && (
              <p className="mt-3 text-xs text-muted">Insurance: {request.insuranceType.replace(/_/g, " ")}</p>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-sm font-semibold text-slate-800">Clinician review</h2>
            <div className="mt-3">
              <ReviewForm
                requestId={request.id}
                systemUrgency={systemUrgency}
                existingOverride={(request.clinicianReview?.overrideUrgency as UrgencyLevel) ?? null}
                existingReason={request.clinicianReview?.overrideReason ?? null}
                existingNote={request.clinicianReview?.note ?? null}
                alreadyReviewed={Boolean(request.clinicianReview?.reviewed)}
              />
            </div>
          </Card>
        </div>
      </div>
    </Container>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-3 sm:gap-4">
      <dt className="font-medium text-slate-600 sm:col-span-1">{label}</dt>
      <dd className="text-slate-900 sm:col-span-2">{value}</dd>
    </div>
  );
}

function getAnswerLabel(
  answers: { questionId: string; answerValue: string }[],
  questionId: string,
): string | null {
  const answer = answers.find((a) => a.questionId === questionId);
  if (!answer) return null;
  const question = getQuestionById(questionId);
  const value = JSON.parse(answer.answerValue);
  return question ? formatAnswerValue(question, value) : String(value);
}
