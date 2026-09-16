import type { AIAssessmentInput, AIAssessmentOutput, AIProviderResult, UrgencyLevel } from "@/types";
import type { AIProvider } from "./provider";
import { CLINICIAN_TYPE_BY_CATEGORY, TIMEFRAME_BY_URGENCY } from "@/lib/triage/mappings";

// Deterministic, zero-cost, reproducible AI provider used by default (AI_PROVIDER=mock).
// It simulates the kind of structured judgement an LLM would return, from the same
// structured input a real provider receives — nothing here reads raw free text.
// This lets the whole application, its automated tests, and demonstrations run
// end-to-end without any API key or network call (section 10).

function parseSeverity(severity: string): number | null {
  const n = Number(severity);
  return Number.isFinite(n) ? n : null;
}

function urgencyFromScore(score: number): UrgencyLevel {
  if (score >= 9) return "Emergency";
  if (score >= 6) return "Urgent";
  if (score >= 3) return "Priority";
  return "Routine";
}

export class MockAIProvider implements AIProvider {
  readonly name = "mock" as const;

  async assess(input: AIAssessmentInput): Promise<AIProviderResult> {
    const severityNum = parseSeverity(input.severity);
    const missingInformation: string[] = [];

    if (severityNum === null) missingInformation.push("Severity rating");
    if (!input.duration) missingInformation.push("Duration of symptoms");
    if (!input.worsening) missingInformation.push("Whether symptoms are worsening");
    if (input.symptoms.length === 0 && input.primaryConcern.trim().length < 8) {
      missingInformation.push("A clearer description of the main concern");
    }

    // Too little to safely assess.
    const answeredCount = input.answers.filter((a) => {
      if (typeof a.value === "string") return a.value.trim().length > 0;
      if (Array.isArray(a.value)) return a.value.length > 0;
      return a.value !== undefined;
    }).length;

    if (severityNum === null || answeredCount < 2) {
      return {
        failed: false,
        output: {
          suggestedUrgency: "InsufficientInformation",
          summary:
            "There is not enough structured information to safely estimate urgency for this appointment request.",
          reasoning: ["Key details such as severity or symptom answers were not provided."],
          riskIndicators: input.riskIndicators,
          missingInformation:
            missingInformation.length > 0 ? missingInformation : ["Additional symptom detail"],
          recommendedClinicianType: CLINICIAN_TYPE_BY_CATEGORY[input.category] ?? "General Practitioner",
          recommendedTimeframe: TIMEFRAME_BY_URGENCY.InsufficientInformation,
          confidence: 0.25,
        },
      };
    }

    let score = severityNum * 0.6;
    const reasoning: string[] = [`Severity was reported as ${severityNum}/10.`];

    if (input.worsening === "worsening") {
      score += 2;
      reasoning.push("Symptoms were reported as worsening.");
    } else if (input.worsening === "same") {
      score += 0.5;
    } else if (input.worsening === "improving") {
      reasoning.push("Symptoms were reported as improving.");
    }

    if (input.duration === "under_24h" && severityNum >= 7) {
      score += 1;
      reasoning.push("Symptoms began recently (under 24 hours) at high severity.");
    }

    const associatedCount = input.associatedSymptoms.filter((s) => s !== "none").length;
    if (associatedCount > 0) {
      score += Math.min(associatedCount, 3) * 0.5;
      reasoning.push(
        `${associatedCount} associated symptom${associatedCount === 1 ? "" : "s"} reported (${input.associatedSymptoms
          .filter((s) => s !== "none")
          .join(", ")}).`,
      );
    }

    if (input.riskIndicators.length > 0) {
      score += input.riskIndicators.length * 1.2;
      reasoning.push(
        `${input.riskIndicators.length} risk indicator${input.riskIndicators.length === 1 ? "" : "s"} identified from responses.`,
      );
    }

    if (input.duration === "over_4_weeks" && severityNum <= 5) {
      score -= 0.5;
      reasoning.push("Symptoms have been present for an extended period at a lower reported severity.");
    }

    score = Math.max(0, score);
    const suggestedUrgency = urgencyFromScore(score);

    const confidenceBase = 0.9 - missingInformation.length * 0.08 - (answeredCount < 4 ? 0.1 : 0);
    const confidence = Math.min(0.95, Math.max(0.4, Number(confidenceBase.toFixed(2))));

    const output: AIAssessmentOutput = {
      suggestedUrgency,
      summary: buildSummary(input, severityNum, suggestedUrgency),
      reasoning,
      riskIndicators: input.riskIndicators,
      missingInformation,
      recommendedClinicianType: CLINICIAN_TYPE_BY_CATEGORY[input.category] ?? "General Practitioner",
      recommendedTimeframe: TIMEFRAME_BY_URGENCY[suggestedUrgency],
      confidence,
    };

    return { failed: false, output };
  }
}

function buildSummary(input: AIAssessmentInput, severity: number, urgency: UrgencyLevel): string {
  const concern = input.primaryConcern.trim() || "an unspecified concern";
  const durationLabel = input.duration.replace(/_/g, " ");
  return `Patient reports ${concern} (severity ${severity}/10, ${input.worsening || "progression not specified"}, duration ${durationLabel}). Suggested appointment urgency: ${urgency}.`;
}
