import "server-only";
import { evaluateSafetyRules, computeSafetyFloor, type SafetyFloor } from "@/lib/safety/engine";
import { runAIAssessment } from "@/lib/ai/aiService";
import { getRelevantQuestions, formatAnswerValue } from "@/lib/questions/engine";
import { TIMEFRAME_BY_URGENCY } from "./mappings";
import { URGENCY_ORDER } from "@/types";
import type {
  AIAssessmentInput,
  AIProviderResult,
  AnsweredQuestion,
  AnswerMap,
  ClinicianExplanation,
  ComplaintCategory,
  TriageResult,
  TriageSource,
  UrgencyLevel,
} from "@/types";

// Triage Decision Engine (section 9 / 28):
//   Deterministic emergency rule -> Urgency safety rules -> Structured AI assessment
//   -> Application validation -> Final triage recommendation -> Human clinician review
//
// This module is the ONLY place the final urgencyLevel is decided. Safety rules run
// first and unconditionally; the AI is asked for its assessment regardless (for its
// explanatory value) but can never lower the urgency below whatever floor the safety
// rules established — it can only ever raise it.

export function buildAIInput(
  category: ComplaintCategory,
  concernText: string,
  answers: AnswerMap,
): AIAssessmentInput {
  const relevantQuestions = getRelevantQuestions(category, answers);
  const safetyEvaluations = evaluateSafetyRules(category, answers);
  const riskIndicators = safetyEvaluations.filter((e) => e.triggered).map((e) => e.description);

  const associatedRaw = answers["core_associated_symptoms"];
  const associatedSymptoms = Array.isArray(associatedRaw)
    ? (associatedRaw as string[]).filter((v) => v !== "none")
    : [];

  const symptoms: string[] = [];
  const answeredQuestions: AnsweredQuestion[] = [];

  for (const q of relevantQuestions) {
    const value = answers[q.questionId];
    if (value === undefined) continue;
    answeredQuestions.push({
      questionId: q.questionId,
      questionText: q.questionText,
      answerType: q.answerType,
      value,
    });
    if (q.category !== "core" && q.answerType !== "boolean") {
      symptoms.push(formatAnswerValue(q, value));
    }
  }

  return {
    primaryConcern: concernText,
    category,
    duration: String(answers["core_duration"] ?? ""),
    severity: String(answers["core_severity"] ?? ""),
    worsening: String(answers["core_progression"] ?? ""),
    symptoms,
    associatedSymptoms,
    riskIndicators,
    answers: answeredQuestions,
  };
}

export interface DetailedTriageRun {
  safetyFloor: SafetyFloor;
  aiResult: AIProviderResult;
  triageResult: TriageResult;
}

/** Runs the full pipeline and returns every intermediate result — used by the
 * evaluation framework, which needs the raw AI output alongside the final merged
 * result, not just the final result callers normally need (see runTriage below). */
export async function runTriageDetailed(
  category: ComplaintCategory,
  concernText: string,
  answers: AnswerMap,
): Promise<DetailedTriageRun> {
  const safetyEvaluations = evaluateSafetyRules(category, answers);
  const safetyFloor = computeSafetyFloor(safetyEvaluations);
  const aiInput = buildAIInput(category, concernText, answers);
  const aiResult = await runAIAssessment(aiInput);
  const triageResult = mergeTriageResult(safetyFloor, aiResult);

  return { safetyFloor, aiResult, triageResult };
}

export async function runTriage(
  category: ComplaintCategory,
  concernText: string,
  answers: AnswerMap,
): Promise<TriageResult> {
  const { triageResult } = await runTriageDetailed(category, concernText, answers);
  return triageResult;
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter((v) => v && v.trim().length > 0)));
}

export function mergeTriageResult(safetyFloor: SafetyFloor, aiResult: AIProviderResult): TriageResult {
  const floorLevel = safetyFloor.urgencyFloor;
  const floorRules = safetyFloor.triggeredRules;

  let urgencyLevel: UrgencyLevel;
  let finalSource: TriageSource;
  let aiSummary: string;
  let aiConfidence: number;
  let missingInformation: string[];
  let recommendedTimeframe: string;
  let recommendedClinicianType: string;
  let riskIndicators: string[];
  let reasoningSummary: string[];

  if (aiResult.failed || !aiResult.output) {
    // AI unavailable — never manufacture an AI result. Safety rules still apply in full.
    urgencyLevel = floorLevel ?? "InsufficientInformation";
    finalSource = "ai_unavailable_fallback";
    aiSummary =
      "AI assessment unavailable — this result is based on deterministic safety rules only and requires full clinician review.";
    aiConfidence = 0;
    missingInformation = ["Full AI-assisted analysis could not be completed for this request."];
    recommendedTimeframe = TIMEFRAME_BY_URGENCY[urgencyLevel];
    recommendedClinicianType = "General Practitioner";
    riskIndicators = floorRules.map((r) => r.description);
    reasoningSummary = floorLevel
      ? floorRules.map((r) => r.explanation)
      : ["The AI assessment service was unavailable, so this request has been marked for full human review."];
  } else {
    const ai = aiResult.output;
    const aiOrder = URGENCY_ORDER[ai.suggestedUrgency];
    const floorOrder = floorLevel ? URGENCY_ORDER[floorLevel] : -1;
    const floorWins = floorLevel !== null && floorOrder >= aiOrder;

    urgencyLevel = floorWins ? (floorLevel as UrgencyLevel) : ai.suggestedUrgency;
    finalSource = floorWins ? "safety_rule" : "ai";
    aiSummary = ai.summary;
    aiConfidence = ai.confidence;
    missingInformation = ai.missingInformation;
    recommendedTimeframe = floorWins ? TIMEFRAME_BY_URGENCY[urgencyLevel] : ai.recommendedTimeframe;
    recommendedClinicianType = ai.recommendedClinicianType;
    riskIndicators = dedupe([...floorRules.map((r) => r.description), ...ai.riskIndicators]);
    reasoningSummary = dedupe([...floorRules.map((r) => r.explanation), ...ai.reasoning]);
  }

  const clinicianExplanation: ClinicianExplanation = {
    triggeredDeterministicRules: floorRules.map((r) => `${r.ruleId} — ${r.description}`),
    majorAssessmentFactors: reasoningSummary,
    missingInformation,
    aiRecommendation:
      aiResult.failed || !aiResult.output
        ? `AI assessment unavailable (${aiResult.failureReason ?? "unknown reason"}).`
        : `AI suggested "${aiResult.output.suggestedUrgency}" (confidence ${(aiResult.output.confidence * 100).toFixed(0)}%).`,
    finalApplicationDecision: buildFinalDecisionExplanation(floorLevel, finalSource, urgencyLevel),
  };

  return {
    urgencyLevel,
    reasoningSummary: reasoningSummary.slice(0, 6),
    triggeredRules: floorRules,
    riskIndicators,
    missingInformation,
    recommendedTimeframe,
    recommendedClinicianType,
    aiSummary,
    aiConfidence,
    requiresHumanReview: true,
    finalSource,
    clinicianExplanation,
  };
}

function buildFinalDecisionExplanation(
  floorLevel: UrgencyLevel | null,
  finalSource: TriageSource,
  urgencyLevel: UrgencyLevel,
): string {
  if (finalSource === "ai_unavailable_fallback") {
    return floorLevel
      ? `A deterministic safety rule set a mandatory ${floorLevel} floor. The AI service was unavailable, so the result is based on safety rules alone and requires full clinician review.`
      : `The AI service was unavailable and no safety rule was triggered, so this request is marked Insufficient Information and requires full clinician review.`;
  }
  if (finalSource === "safety_rule") {
    return `A deterministic safety rule set a mandatory ${urgencyLevel} floor, which the AI assessment cannot lower.`;
  }
  return floorLevel
    ? `A safety rule set an ${floorLevel} floor, and the AI assessment raised the urgency above it to ${urgencyLevel}.`
    : `No deterministic safety rule was triggered. The final urgency of ${urgencyLevel} follows the AI assessment.`;
}
