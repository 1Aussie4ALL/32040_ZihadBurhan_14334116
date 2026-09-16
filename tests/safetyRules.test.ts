import { describe, it, expect } from "vitest";
import { evaluateSafetyRules, computeSafetyFloor } from "@/lib/safety/engine";
import { mergeTriageResult } from "@/lib/triage/engine";
import type { AIProviderResult } from "@/types";

describe("safety rule engine", () => {
  it("does not trigger any rule for a benign, low-severity presentation", () => {
    const evaluations = evaluateSafetyRules("respiratory", {
      core_severity: 2,
      resp_breathing_difficulty: "none",
    });
    const floor = computeSafetyFloor(evaluations);
    expect(floor.urgencyFloor).toBeNull();
    expect(floor.triggeredRules).toHaveLength(0);
  });

  it("triggers SR-001 for severe breathing difficulty and sets an Emergency floor", () => {
    const evaluations = evaluateSafetyRules("respiratory", {
      resp_breathing_difficulty: "severe",
    });
    const floor = computeSafetyFloor(evaluations);
    expect(floor.isEmergency).toBe(true);
    expect(floor.urgencyFloor).toBe("Emergency");
    expect(floor.triggeredRules.map((r) => r.ruleId)).toContain("SR-001-SEVERE-BREATHING");
  });

  it("triggers the cardiac warning cluster rule only when both radiation AND sweating are present", () => {
    const partial = computeSafetyFloor(
      evaluateSafetyRules("cardiovascular", { cv_radiates: true, cv_sweating: false }),
    );
    expect(partial.urgencyFloor).toBeNull();

    const full = computeSafetyFloor(
      evaluateSafetyRules("cardiovascular", { cv_radiates: true, cv_sweating: true }),
    );
    expect(full.urgencyFloor).toBe("Emergency");
    expect(full.triggeredRules.map((r) => r.ruleId)).toContain("SR-002-CARDIAC-WARNING-CLUSTER");
  });

  it("sets an Urgent (not Emergency) floor for GI bleeding", () => {
    const floor = computeSafetyFloor(evaluateSafetyRules("abdominal", { abd_bleeding: true }));
    expect(floor.urgencyFloor).toBe("Urgent");
    expect(floor.isEmergency).toBe(false);
  });

  it("triggers the imminent self-harm rule regardless of low self-rated severity", () => {
    const floor = computeSafetyFloor(
      evaluateSafetyRules("mental_wellbeing", { core_severity: 1, mh_safety: "frequently_or_plan" }),
    );
    expect(floor.urgencyFloor).toBe("Emergency");
  });
});

describe("emergency rules override AI — the AI can never downgrade a safety-rule floor", () => {
  it("forces Emergency even when the AI (successfully) suggests Routine", () => {
    const floor = computeSafetyFloor(evaluateSafetyRules("respiratory", { resp_breathing_difficulty: "severe" }));
    const aiResult: AIProviderResult = {
      failed: false,
      output: {
        suggestedUrgency: "Routine",
        summary: "AI thinks this is mild.",
        reasoning: ["AI reasoning"],
        riskIndicators: [],
        missingInformation: [],
        recommendedClinicianType: "General Practitioner",
        recommendedTimeframe: "Within 1-2 weeks",
        confidence: 0.9,
      },
    };

    const result = mergeTriageResult(floor, aiResult);
    expect(result.urgencyLevel).toBe("Emergency");
    expect(result.finalSource).toBe("safety_rule");
    expect(result.requiresHumanReview).toBe(true);
  });

  it("still allows the AI to raise urgency above an Urgent floor", () => {
    const floor = computeSafetyFloor(evaluateSafetyRules("abdominal", { abd_bleeding: true })); // Urgent floor
    const aiResult: AIProviderResult = {
      failed: false,
      output: {
        suggestedUrgency: "Emergency",
        summary: "AI detected additional severe indicators.",
        reasoning: [],
        riskIndicators: [],
        missingInformation: [],
        recommendedClinicianType: "General Practitioner",
        recommendedTimeframe: "Immediate",
        confidence: 0.8,
      },
    };
    const result = mergeTriageResult(floor, aiResult);
    expect(result.urgencyLevel).toBe("Emergency");
    expect(result.finalSource).toBe("ai");
  });

  it("never lets the AI push urgency below the deterministic floor even at the boundary (equal levels)", () => {
    const floor = computeSafetyFloor(evaluateSafetyRules("abdominal", { abd_bleeding: true })); // Urgent
    const aiResult: AIProviderResult = {
      failed: false,
      output: {
        suggestedUrgency: "Priority",
        summary: "AI thinks this is less urgent.",
        reasoning: [],
        riskIndicators: [],
        missingInformation: [],
        recommendedClinicianType: "General Practitioner",
        recommendedTimeframe: "Within 24-48 hours",
        confidence: 0.7,
      },
    };
    const result = mergeTriageResult(floor, aiResult);
    expect(result.urgencyLevel).toBe("Urgent");
    expect(result.finalSource).toBe("safety_rule");
  });
});
