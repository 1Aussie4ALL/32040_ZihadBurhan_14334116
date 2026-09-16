import { PATIENT_SCENARIOS } from "@/data/scenarios";
import { URGENCY_ORDER, ALL_URGENCY_LEVELS } from "@/types";
import type { PatientScenario, UrgencyLevel } from "@/types";

// Conventional-booking baseline (work package 6.4).
//
// To claim this project improves on conventional online booking, "conventional"
// has to be something measurable rather than a rhetorical straw man. These two
// models stand in for how a traditional booking form actually behaves, and both are
// run over the *same* 26 synthetic scenarios as the real pipeline, scored the same
// way. The only input either model gets is the single free-text "reason for visit"
// field — which is the whole point: that is all a conventional form collects.
//
//   no_triage        Most online GP booking forms assign no urgency at all. The
//                    patient picks any open slot and requests are handled
//                    first-come-first-served, so every request carries the same
//                    (routine) priority into the queue.
//
//   keyword_triage   A deliberately *generous* model of reception staff skimming
//                    the free text for alarming wording before the appointment.
//                    It is generous because it never gets tired, never has a queue
//                    of phone calls waiting, and reads every word every time.
//
// Note on fairness: the keyword model's score depends heavily on how the scenario
// free text happens to be worded, and those texts were written alongside the system
// rather than collected from real patients. It is a reference point, not evidence
// about real reception triage. See docs/workflow-comparison.md.

export type BaselineModel = "no_triage" | "keyword_triage";

/** Wording that would make most reception staff escalate immediately. */
const EMERGENCY_PHRASES = [
  "can't breathe",
  "cannot breathe",
  "barely breathe",
  "chest pain",
  "chest tightness",
  "slurred",
  "unconscious",
  "passed out",
  "blue lips",
  "throat feels tight",
  "swollen up",
  "ending my life",
  "end my life",
  "kill myself",
  "suicide",
  "suicidal",
  "heart attack",
  "stroke",
];

/** Wording that would prompt "let's get you in sooner", short of an emergency. */
const URGENT_PHRASES = [
  "blood",
  "bleeding",
  "vomit",
  "can't keep",
  "cannot keep",
  "fever",
  "temperature",
  "numb",
  "severe",
];

function matches(text: string, phrases: string[]): string[] {
  const haystack = text.toLowerCase();
  return phrases.filter((p) => haystack.includes(p));
}

export interface BaselineScenarioResult {
  scenarioId: string;
  scenarioDescription: string;
  expectedUrgency: UrgencyLevel;
  baselineUrgency: UrgencyLevel;
  correct: boolean;
  underTriaged: boolean;
  overTriaged: boolean;
  /** Which phrases fired, for the keyword model — empty for no_triage. */
  matchedPhrases: string[];
}

export interface BaselineSummary {
  model: BaselineModel;
  totalScenarios: number;
  correctCount: number;
  accuracy: number;
  underTriageCount: number;
  underTriageRate: number;
  overTriageCount: number;
  overTriageRate: number;
  /** Of the scenarios that should be Emergency, how many the model caught. */
  emergencyRecall: number;
  /** Of the scenarios that should be Emergency or Urgent, how many it caught. */
  urgentOrAboveRecall: number;
  confusionMatrix: Record<string, Record<string, number>>;
  results: BaselineScenarioResult[];
}

/** Classifies one scenario using only its free-text reason. */
export function classifyBaseline(
  model: BaselineModel,
  concernText: string,
): { urgency: UrgencyLevel; matchedPhrases: string[] } {
  if (model === "no_triage") {
    // No urgency concept exists in the queue at all; everything is treated alike.
    return { urgency: "Routine", matchedPhrases: [] };
  }

  const emergency = matches(concernText, EMERGENCY_PHRASES);
  if (emergency.length > 0) return { urgency: "Emergency", matchedPhrases: emergency };

  const urgent = matches(concernText, URGENT_PHRASES);
  if (urgent.length > 0) return { urgency: "Urgent", matchedPhrases: urgent };

  // A keyword scan has no way to express "not enough information to decide" — an
  // unrecognised reason simply looks like an ordinary appointment request.
  return { urgency: "Routine", matchedPhrases: [] };
}

function buildConfusionMatrix(results: BaselineScenarioResult[]): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const expected of ALL_URGENCY_LEVELS) {
    matrix[expected] = {};
    for (const actual of ALL_URGENCY_LEVELS) matrix[expected][actual] = 0;
  }
  for (const r of results) matrix[r.expectedUrgency][r.baselineUrgency] += 1;
  return matrix;
}

export function runBaseline(
  model: BaselineModel,
  scenarios: PatientScenario[] = PATIENT_SCENARIOS,
): BaselineSummary {
  const results: BaselineScenarioResult[] = scenarios.map((scenario) => {
    const { urgency, matchedPhrases } = classifyBaseline(model, scenario.concernText);
    const correct = urgency === scenario.expectedUrgency;
    return {
      scenarioId: scenario.scenarioId,
      scenarioDescription: scenario.description,
      expectedUrgency: scenario.expectedUrgency,
      baselineUrgency: urgency,
      correct,
      underTriaged: !correct && URGENCY_ORDER[urgency] < URGENCY_ORDER[scenario.expectedUrgency],
      overTriaged: !correct && URGENCY_ORDER[urgency] > URGENCY_ORDER[scenario.expectedUrgency],
      matchedPhrases,
    };
  });

  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const underTriageCount = results.filter((r) => r.underTriaged).length;
  const overTriageCount = results.filter((r) => r.overTriaged).length;

  const expectedEmergency = results.filter((r) => r.expectedUrgency === "Emergency");
  const caughtEmergency = expectedEmergency.filter((r) => r.baselineUrgency === "Emergency");

  const expectedUrgentPlus = results.filter((r) => URGENCY_ORDER[r.expectedUrgency] >= URGENCY_ORDER.Urgent);
  const caughtUrgentPlus = expectedUrgentPlus.filter(
    (r) => URGENCY_ORDER[r.baselineUrgency] >= URGENCY_ORDER.Urgent,
  );

  return {
    model,
    totalScenarios: total,
    correctCount,
    accuracy: total > 0 ? correctCount / total : 0,
    underTriageCount,
    underTriageRate: total > 0 ? underTriageCount / total : 0,
    overTriageCount,
    overTriageRate: total > 0 ? overTriageCount / total : 0,
    emergencyRecall: expectedEmergency.length > 0 ? caughtEmergency.length / expectedEmergency.length : 0,
    urgentOrAboveRecall:
      expectedUrgentPlus.length > 0 ? caughtUrgentPlus.length / expectedUrgentPlus.length : 0,
    confusionMatrix: buildConfusionMatrix(results),
    results,
  };
}
