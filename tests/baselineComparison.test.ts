import { describe, it, expect } from "vitest";
import { classifyBaseline, runBaseline } from "@/lib/evaluation/baseline";
import { measureCompleteness, measureScenarioCompleteness } from "@/lib/evaluation/completeness";
import { PATIENT_SCENARIOS } from "@/data/scenarios";
import { URGENCY_ORDER } from "@/types";

// Work package 6.4/6.5 — the conventional-booking baselines and the information
// completeness metric. These back the claims made in docs/evaluation-results.md, so
// they are tested like any other logic rather than trusted because they produce a
// flattering number.

describe("conventional booking baseline — no triage", () => {
  it("assigns the same routine priority to every request, however severe", () => {
    expect(classifyBaseline("no_triage", "I can barely breathe").urgency).toBe("Routine");
    expect(classifyBaseline("no_triage", "I'd like my annual check-up").urgency).toBe("Routine");
  });

  it("catches none of the emergency scenarios", () => {
    const summary = runBaseline("no_triage");
    expect(summary.emergencyRecall).toBe(0);
    expect(summary.urgentOrAboveRecall).toBe(0);
  });

  it("under-triages every scenario that should rank above routine", () => {
    const summary = runBaseline("no_triage");
    const shouldBeAboveRoutine = PATIENT_SCENARIOS.filter(
      (s) => URGENCY_ORDER[s.expectedUrgency] > URGENCY_ORDER.Routine,
    );
    expect(summary.underTriageCount).toBe(shouldBeAboveRoutine.length);
  });
});

describe("conventional booking baseline — keyword triage", () => {
  it("escalates explicit red-flag wording", () => {
    expect(classifyBaseline("keyword_triage", "I can barely breathe").urgency).toBe("Emergency");
    expect(classifyBaseline("keyword_triage", "my speech sounds slurred").urgency).toBe("Emergency");
    expect(classifyBaseline("keyword_triage", "thoughts of ending my life").urgency).toBe("Emergency");
  });

  it("raises a lesser flag on urgent-sounding wording", () => {
    expect(classifyBaseline("keyword_triage", "I noticed some blood this morning").urgency).toBe("Urgent");
    expect(classifyBaseline("keyword_triage", "my foot feels numb").urgency).toBe("Urgent");
  });

  it("matches words rather than meaning, so benign text can be escalated", () => {
    // "blood pressure medication" is a routine repeat prescription, not bleeding.
    const result = classifyBaseline("keyword_triage", "repeat prescription for my blood pressure medication");
    expect(result.urgency).toBe("Urgent");
    expect(result.matchedPhrases).toContain("blood");
  });

  it("cannot express insufficient information — vague text reads as routine", () => {
    expect(classifyBaseline("keyword_triage", "Not feeling great lately.").urgency).toBe("Routine");
    expect(classifyBaseline("keyword_triage", "Some pain.").urgency).toBe("Routine");
  });

  it("cannot grade severity, so every Priority scenario falls through", () => {
    const summary = runBaseline("keyword_triage");
    const priorityResults = summary.results.filter((r) => r.expectedUrgency === "Priority");

    expect(priorityResults.length).toBeGreaterThan(0);
    expect(priorityResults.every((r) => r.baselineUrgency !== "Priority")).toBe(true);
  });

  it("misses the scenario whose risk appears only in a structured answer", () => {
    // SCN-EDGE02: free text is "Feeling pretty flat lately, nothing major", but the
    // structured mental-health answer records self-harm thoughts with a plan.
    const summary = runBaseline("keyword_triage");
    const edge = summary.results.find((r) => r.scenarioId === "SCN-EDGE02");

    expect(edge?.expectedUrgency).toBe("Emergency");
    expect(edge?.baselineUrgency).toBe("Routine");
    expect(edge?.underTriaged).toBe(true);
  });
});

describe("baseline scoring is consistent", () => {
  it("scores every scenario exactly once, in exactly one outcome bucket", () => {
    for (const model of ["no_triage", "keyword_triage"] as const) {
      const summary = runBaseline(model);
      expect(summary.totalScenarios).toBe(PATIENT_SCENARIOS.length);
      expect(summary.correctCount + summary.underTriageCount + summary.overTriageCount).toBe(
        summary.totalScenarios,
      );
      for (const r of summary.results) {
        expect([r.correct, r.underTriaged, r.overTriaged].filter(Boolean)).toHaveLength(1);
      }
    }
  });

  it("confusion matrix totals match the scenario count", () => {
    const summary = runBaseline("keyword_triage");
    const total = Object.values(summary.confusionMatrix)
      .flatMap((row) => Object.values(row))
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(summary.totalScenarios);
  });

  it("both baselines perform worse than the system's own regression floor", () => {
    // The system's accuracy is asserted separately in evaluation.test.ts; here we
    // only assert the comparison is worth making at all.
    expect(runBaseline("no_triage").accuracy).toBeLessThan(0.5);
    expect(runBaseline("keyword_triage").accuracy).toBeLessThan(0.9);
  });
});

describe("information completeness", () => {
  it("counts a single clinical field for conventional booking", () => {
    const summary = measureCompleteness();
    expect(summary.conventionalMeanFields).toBe(1);
  });

  it("captures substantially more structured detail than a free-text reason", () => {
    const summary = measureCompleteness();
    expect(summary.systemMeanFields).toBeGreaterThan(5);
    expect(summary.multiplier).toBeGreaterThan(3);
  });

  it("counts only questions that were actually answered", () => {
    // SCN-I01 answers nothing at all, so there is no structured detail to show.
    const vague = PATIENT_SCENARIOS.find((s) => s.scenarioId === "SCN-I01")!;
    const measured = measureScenarioCompleteness(vague);

    expect(measured.structuredAnswers).toBe(0);
    expect(measured.systemFields).toBe(1); // the free-text concern only
    expect(measured.capturedFields).toEqual([]);
  });

  it("surfaces risk indicators on scenarios where a safety rule fires", () => {
    const cardiac = PATIENT_SCENARIOS.find((s) => s.scenarioId === "SCN-E01")!;
    const measured = measureScenarioCompleteness(cardiac);

    expect(measured.riskIndicators).toBeGreaterThan(0);
    expect(measured.structuredAnswers).toBeGreaterThan(5);
  });

  it("renders answers as human-readable labels, not raw option codes", () => {
    const cardiac = PATIENT_SCENARIOS.find((s) => s.scenarioId === "SCN-E01")!;
    const measured = measureScenarioCompleteness(cardiac);
    const duration = measured.capturedFields.find((f) => f.label.includes("How long"));

    expect(duration?.value).toBe("Less than 24 hours");
    expect(duration?.value).not.toBe("under_24h");
  });
});
