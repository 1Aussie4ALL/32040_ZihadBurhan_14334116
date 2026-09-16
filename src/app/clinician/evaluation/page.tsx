import type { Metadata } from "next";
import { requireClinician } from "@/lib/auth/session";
import { getLatestEvaluationRun } from "@/lib/evaluation/runner";
import { Container, Card } from "@/components/common/Card";
import { EvaluationDashboard } from "@/components/clinician/EvaluationDashboard";
import { PATIENT_SCENARIOS } from "@/data/scenarios";
import { getRelevantQuestions, formatAnswerValue } from "@/lib/questions/engine";

export const metadata: Metadata = { title: "Evaluation" };

export default async function EvaluationPage() {
  await requireClinician();
  const initialSummary = await getLatestEvaluationRun();

  const example = PATIENT_SCENARIOS.find((s) => s.scenarioId === "SCN-P01")!;
  const exampleQuestions = getRelevantQuestions(example.category, example.answers);
  const aiAssistedFields = exampleQuestions
    .filter((q) => example.answers[q.questionId] !== undefined)
    .map((q) => ({ label: q.questionText, value: formatAnswerValue(q, example.answers[q.questionId]) }));

  return (
    <Container className="py-8">
      <EvaluationDashboard initialSummary={initialSummary} scenarioCount={PATIENT_SCENARIOS.length} />

      <Card className="mt-8 p-6">
        <h2 className="text-lg font-semibold text-slate-900">Information completeness: traditional vs. AI-assisted</h2>
        <p className="mt-1 text-sm text-muted">
          A traditional booking form typically captures a single free-text reason. This system captures
          structured, adaptive detail instead — illustrated below using scenario {example.scenarioId}.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Traditional booking</p>
            <p className="mt-2 text-sm text-slate-800">Reason: {example.concernText}</p>
          </div>
          <div className="rounded-lg border border-brand/30 bg-brand-light/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark">AI-assisted booking</p>
            <dl className="mt-2 space-y-1 text-sm text-slate-800">
              <div>
                <dt className="inline font-medium">Complaint: </dt>
                <dd className="inline">{example.concernText}</dd>
              </div>
              {aiAssistedFields.map((f) => (
                <div key={f.label}>
                  <dt className="inline font-medium">{f.label}: </dt>
                  <dd className="inline">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Card>
    </Container>
  );
}
