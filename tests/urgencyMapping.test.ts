import { describe, it, expect } from "vitest";
import { mergeTriageResult } from "@/lib/triage/engine";
import type { SafetyFloor } from "@/lib/safety/engine";
import type { AIProviderResult } from "@/types";

const NO_FLOOR: SafetyFloor = { urgencyFloor: null, triggeredRules: [], isEmergency: false };

const SUCCESSFUL_AI = (urgency: "Emergency" | "Urgent" | "Priority" | "Routine" | "InsufficientInformation"): AIProviderResult => ({
  failed: false,
  output: {
    suggestedUrgency: urgency,
    summary: "summary",
    reasoning: ["reason one"],
    riskIndicators: [],
    missingInformation: [],
    recommendedClinicianType: "General Practitioner",
    recommendedTimeframe: "some timeframe",
    confidence: 0.8,
  },
});

describe("urgency merge logic (no safety floor)", () => {
  it("follows the AI's suggestion directly when no safety rule fired", () => {
    const result = mergeTriageResult(NO_FLOOR, SUCCESSFUL_AI("Priority"));
    expect(result.urgencyLevel).toBe("Priority");
    expect(result.finalSource).toBe("ai");
  });

  it("passes through InsufficientInformation from the AI when there is no floor", () => {
    const result = mergeTriageResult(NO_FLOOR, SUCCESSFUL_AI("InsufficientInformation"));
    expect(result.urgencyLevel).toBe("InsufficientInformation");
  });

  it("always sets requiresHumanReview to true regardless of urgency", () => {
    for (const urgency of ["Emergency", "Urgent", "Priority", "Routine", "InsufficientInformation"] as const) {
      const result = mergeTriageResult(NO_FLOOR, SUCCESSFUL_AI(urgency));
      expect(result.requiresHumanReview).toBe(true);
    }
  });
});

describe("AI service failure fallback (section 29)", () => {
  const FAILED_AI: AIProviderResult = { failed: true, output: null, failureReason: "simulated outage" };

  it("does not manufacture an AI result when the AI is unavailable and no safety rule fired", () => {
    const result = mergeTriageResult(NO_FLOOR, FAILED_AI);
    expect(result.urgencyLevel).toBe("InsufficientInformation");
    expect(result.finalSource).toBe("ai_unavailable_fallback");
    expect(result.aiConfidence).toBe(0);
    expect(result.requiresHumanReview).toBe(true);
  });

  it("keeps the deterministic safety floor even when the AI is unavailable", () => {
    const floor: SafetyFloor = {
      urgencyFloor: "Emergency",
      isEmergency: true,
      triggeredRules: [
        {
          ruleId: "SR-001-SEVERE-BREATHING",
          description: "Severe breathing difficulty",
          triggered: true,
          severity: "emergency",
          result: "Emergency",
          explanation: "explanation",
          patientMessage: "message",
          clinicianFlag: "flag",
        },
      ],
    };
    const result = mergeTriageResult(floor, FAILED_AI);
    expect(result.urgencyLevel).toBe("Emergency");
    expect(result.finalSource).toBe("ai_unavailable_fallback");
    expect(result.triggeredRules).toHaveLength(1);
  });
});
