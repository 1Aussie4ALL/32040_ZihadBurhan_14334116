import { PATIENT_SCENARIOS } from "@/data/scenarios";
import { getRelevantQuestions, formatAnswerValue } from "@/lib/questions/engine";
import { evaluateSafetyRules } from "@/lib/safety/engine";
import type { PatientScenario } from "@/types";

// Information completeness (work package 6.5).
//
// Classification accuracy is only half the claim this project makes. The other half
// is that a clinician opening a request sees materially more than "Reason: stomach
// pain" — so this module counts, per scenario, how many discrete clinical data
// points each workflow actually puts in front of them.
//
// A "data point" is one structured, separately-answered clinical field. The
// conventional baseline scores 1: the free-text reason. Name, phone and email are
// excluded from both sides — they are administrative, collected identically by
// both workflows, and counting them would flatter both equally without saying
// anything about clinical information.

/** The single free-text "reason for visit" field a conventional form collects. */
const CONVENTIONAL_CLINICAL_FIELDS = 1;

export interface ScenarioCompleteness {
  scenarioId: string;
  scenarioDescription: string;
  /** Clinical data points a conventional booking form would capture. */
  conventionalFields: number;
  /** Structured questions actually answered in this scenario. */
  structuredAnswers: number;
  /** Deterministic risk indicators surfaced from those answers. */
  riskIndicators: number;
  /** Total clinical data points the system presents (free text + answers). */
  systemFields: number;
  /** Named example fields, for the side-by-side table in the report. */
  capturedFields: { label: string; value: string }[];
}

export interface CompletenessSummary {
  totalScenarios: number;
  conventionalMeanFields: number;
  systemMeanFields: number;
  /** How many times more clinical data points the system captures on average. */
  multiplier: number;
  /** Scenarios where the structured layer surfaced at least one risk indicator. */
  scenariosWithRiskIndicators: number;
  /** Scenarios where a conventional form would capture nothing beyond the reason. */
  meanAdditionalFields: number;
  results: ScenarioCompleteness[];
}

export function measureScenarioCompleteness(scenario: PatientScenario): ScenarioCompleteness {
  const relevant = getRelevantQuestions(scenario.category, scenario.answers);

  const capturedFields = relevant
    .filter((q) => scenario.answers[q.questionId] !== undefined)
    .map((q) => ({
      label: q.questionText,
      value: formatAnswerValue(q, scenario.answers[q.questionId]),
    }));

  const riskIndicators = evaluateSafetyRules(scenario.category, scenario.answers).filter(
    (e) => e.triggered,
  ).length;

  return {
    scenarioId: scenario.scenarioId,
    scenarioDescription: scenario.description,
    conventionalFields: CONVENTIONAL_CLINICAL_FIELDS,
    structuredAnswers: capturedFields.length,
    riskIndicators,
    // The free-text concern is still captured by this system, so it counts too.
    systemFields: capturedFields.length + CONVENTIONAL_CLINICAL_FIELDS,
    capturedFields,
  };
}

export function measureCompleteness(
  scenarios: PatientScenario[] = PATIENT_SCENARIOS,
): CompletenessSummary {
  const results = scenarios.map(measureScenarioCompleteness);
  const total = results.length;

  const sum = (pick: (r: ScenarioCompleteness) => number) =>
    results.reduce((acc, r) => acc + pick(r), 0);

  const conventionalMean = total > 0 ? sum((r) => r.conventionalFields) / total : 0;
  const systemMean = total > 0 ? sum((r) => r.systemFields) / total : 0;

  return {
    totalScenarios: total,
    conventionalMeanFields: conventionalMean,
    systemMeanFields: systemMean,
    multiplier: conventionalMean > 0 ? systemMean / conventionalMean : 0,
    scenariosWithRiskIndicators: results.filter((r) => r.riskIndicators > 0).length,
    meanAdditionalFields: total > 0 ? sum((r) => r.structuredAnswers) / total : 0,
    results,
  };
}
