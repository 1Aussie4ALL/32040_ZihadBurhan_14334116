import { Info } from "lucide-react";
import { Button } from "@/components/common/Button";
import { UrgencyBadge } from "@/components/common/UrgencyBadge";
import { EmergencyBanner } from "@/components/triage/SafetyBanner";
import type { TriageResult } from "@/types";

export function AssessmentResult({
  result,
  onBack,
  onNext,
}: {
  result: TriageResult;
  onBack: () => void;
  onNext: () => void;
}) {
  const isEmergency = result.urgencyLevel === "Emergency";
  const emergencyRule = result.triggeredRules.find((r) => r.severity === "emergency");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Your appointment assessment</h2>
        <p className="mt-1 text-sm text-muted">
          This is decision-support only, based on the information you provided — not a diagnosis.
        </p>
      </div>

      {isEmergency && <EmergencyBanner message={emergencyRule?.patientMessage ?? "Your answers include symptoms that may require immediate medical attention."} />}

      <div className="rounded-xl border border-border-subtle bg-slate-50 p-5">
        <div className="flex flex-wrap items-center gap-3">
          <UrgencyBadge level={result.urgencyLevel} size="lg" />
          <span className="text-sm text-muted">Recommended timeframe: <strong className="text-slate-800">{result.recommendedTimeframe}</strong></span>
        </div>

        {result.reasoningSummary.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-800">
              This appointment was classified as {result.urgencyLevel} because:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {result.reasoningSummary.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        {result.missingInformation.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-800">To improve this assessment, more detail would help on:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
              {result.missingInformation.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-4 flex items-start gap-2 rounded-lg bg-white p-3 text-xs text-muted">
          <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          <p>
            AI confidence: {(result.aiConfidence * 100).toFixed(0)}%. Confidence reflects how much structured
            information was available — it does not mean clinical certainty. A clinician will review this
            request regardless of urgency level before it is treated as final.
          </p>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button type="button" onClick={onNext}>
          Continue to choose a doctor
        </Button>
      </div>
    </div>
  );
}
