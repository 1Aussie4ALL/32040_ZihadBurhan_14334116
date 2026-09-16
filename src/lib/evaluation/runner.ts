import "server-only";
import { PATIENT_SCENARIOS } from "@/data/scenarios";
import { runTriageDetailed } from "@/lib/triage/engine";
import { prisma } from "@/lib/database/prisma";
import { ALL_URGENCY_LEVELS, URGENCY_ORDER } from "@/types";
import type { EvaluationSummary, ScenarioRunResult, UrgencyLevel } from "@/types";

// Evaluation framework (section 27): runs every synthetic scenario through the real
// triage pipeline (safety rules + AI + application logic, exactly as a live request
// would be processed) and computes accuracy, under/over-triage rates, and a
// confusion matrix. Persisted so results can be reviewed later, not just at the
// moment the run happened.

export async function runScenarioSet(): Promise<ScenarioRunResult[]> {
  const results: ScenarioRunResult[] = [];

  for (const scenario of PATIENT_SCENARIOS) {
    const { aiResult, triageResult } = await runTriageDetailed(
      scenario.category,
      scenario.concernText,
      scenario.answers,
    );

    const systemUrgency = triageResult.urgencyLevel;
    const correct = systemUrgency === scenario.expectedUrgency;
    const underTriaged = !correct && URGENCY_ORDER[systemUrgency] < URGENCY_ORDER[scenario.expectedUrgency];
    const overTriaged = !correct && URGENCY_ORDER[systemUrgency] > URGENCY_ORDER[scenario.expectedUrgency];

    results.push({
      scenarioId: scenario.scenarioId,
      scenarioDescription: scenario.description,
      expectedUrgency: scenario.expectedUrgency,
      systemUrgency,
      correct,
      underTriaged,
      overTriaged,
      triggeredRules: triageResult.triggeredRules.map((r) => r.ruleId),
      aiResult: aiResult.output,
      finalResult: triageResult,
    });
  }

  return results;
}

function buildConfusionMatrix(results: ScenarioRunResult[]): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {};
  for (const expected of ALL_URGENCY_LEVELS) {
    matrix[expected] = {};
    for (const actual of ALL_URGENCY_LEVELS) {
      matrix[expected][actual] = 0;
    }
  }
  for (const r of results) {
    matrix[r.expectedUrgency][r.systemUrgency] += 1;
  }
  return matrix;
}

export function summarize(results: ScenarioRunResult[], runId?: string, runAt?: string): EvaluationSummary {
  const total = results.length;
  const correctCount = results.filter((r) => r.correct).length;
  const underTriageCount = results.filter((r) => r.underTriaged).length;
  const overTriageCount = results.filter((r) => r.overTriaged).length;

  return {
    runId,
    runAt: runAt ?? new Date().toISOString(),
    totalScenarios: total,
    correctCount,
    accuracy: total > 0 ? correctCount / total : 0,
    underTriageCount,
    underTriageRate: total > 0 ? underTriageCount / total : 0,
    overTriageCount,
    overTriageRate: total > 0 ? overTriageCount / total : 0,
    confusionMatrix: buildConfusionMatrix(results),
    results,
  };
}

/** Runs the full scenario set, persists an EvaluationRun + EvaluationResult rows
 * for later review, and returns the computed summary. */
export async function runAndPersistEvaluation(): Promise<EvaluationSummary> {
  const results = await runScenarioSet();
  const summary = summarize(results);

  const run = await prisma.evaluationRun.create({
    data: {
      totalScenarios: summary.totalScenarios,
      correctCount: summary.correctCount,
      accuracy: summary.accuracy,
      underTriageCount: summary.underTriageCount,
      overTriageCount: summary.overTriageCount,
      results: {
        create: results.map((r) => ({
          scenarioId: r.scenarioId,
          scenarioDescription: r.scenarioDescription,
          expectedUrgency: r.expectedUrgency,
          systemUrgency: r.systemUrgency,
          correct: r.correct,
          underTriaged: r.underTriaged,
          overTriaged: r.overTriaged,
          triggeredRules: JSON.stringify(r.triggeredRules),
          aiResult: JSON.stringify(r.aiResult),
          finalResult: JSON.stringify(r.finalResult),
        })),
      },
    },
  });

  return { ...summary, runId: run.id, runAt: run.runAt.toISOString() };
}

export async function getLatestEvaluationRun(): Promise<EvaluationSummary | null> {
  const run = await prisma.evaluationRun.findFirst({
    orderBy: { runAt: "desc" },
    include: { results: true },
  });
  if (!run) return null;

  const results: ScenarioRunResult[] = run.results.map((r) => ({
    scenarioId: r.scenarioId,
    scenarioDescription: r.scenarioDescription,
    expectedUrgency: r.expectedUrgency as UrgencyLevel,
    systemUrgency: r.systemUrgency as UrgencyLevel,
    correct: r.correct,
    underTriaged: r.underTriaged,
    overTriaged: r.overTriaged,
    triggeredRules: JSON.parse(r.triggeredRules),
    aiResult: JSON.parse(r.aiResult),
    finalResult: JSON.parse(r.finalResult),
  }));

  return {
    runId: run.id,
    runAt: run.runAt.toISOString(),
    totalScenarios: run.totalScenarios,
    correctCount: run.correctCount,
    accuracy: run.accuracy,
    underTriageCount: run.underTriageCount,
    underTriageRate: run.totalScenarios > 0 ? run.underTriageCount / run.totalScenarios : 0,
    overTriageCount: run.overTriageCount,
    overTriageRate: run.totalScenarios > 0 ? run.overTriageCount / run.totalScenarios : 0,
    confusionMatrix: buildConfusionMatrix(results),
    results,
  };
}
