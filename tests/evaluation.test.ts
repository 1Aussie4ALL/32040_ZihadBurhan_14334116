import { describe, it, expect } from "vitest";
import { runScenarioSet, summarize } from "@/lib/evaluation/runner";
import { PATIENT_SCENARIOS } from "@/data/scenarios";

describe("evaluation framework — synthetic scenario set", () => {
  it("runs all 26+ scenarios through the live pipeline without throwing", async () => {
    const results = await runScenarioSet();
    expect(results).toHaveLength(PATIENT_SCENARIOS.length);
    expect(results.length).toBeGreaterThanOrEqual(20);
  }, 20000);

  it("achieves zero under-triage on the Emergency scenarios (safety-critical)", async () => {
    const results = await runScenarioSet();
    const emergencyScenarios = results.filter((r) => r.expectedUrgency === "Emergency");
    expect(emergencyScenarios.length).toBeGreaterThan(0);
    for (const r of emergencyScenarios) {
      expect(r.systemUrgency).toBe("Emergency");
      expect(r.underTriaged).toBe(false);
    }
  }, 20000);

  it("computes a confusion matrix and summary metrics that are internally consistent", async () => {
    const results = await runScenarioSet();
    const summary = summarize(results);

    expect(summary.totalScenarios).toBe(results.length);
    expect(summary.correctCount + summary.underTriageCount + summary.overTriageCount).toBe(summary.totalScenarios);
    expect(summary.accuracy).toBeCloseTo(summary.correctCount / summary.totalScenarios, 5);

    const matrixTotal = Object.values(summary.confusionMatrix)
      .flatMap((row) => Object.values(row))
      .reduce((a, b) => a + b, 0);
    expect(matrixTotal).toBe(summary.totalScenarios);
  }, 20000);

  it("achieves reasonable overall accuracy on the synthetic scenario set", async () => {
    const results = await runScenarioSet();
    const summary = summarize(results);
    // Not a claim of clinical validity — just a regression guard on the demo dataset.
    expect(summary.accuracy).toBeGreaterThanOrEqual(0.8);
  }, 20000);
});
