import { describe, it, expect } from "vitest";
import { MockAIProvider } from "@/lib/ai/mockProvider";
import { aiAssessmentOutputSchema } from "@/lib/ai/schema";
import { runAIAssessment } from "@/lib/ai/aiService";
import type { AIAssessmentInput } from "@/types";

const BASE_INPUT: AIAssessmentInput = {
  primaryConcern: "Worsening abdominal pain",
  category: "abdominal",
  duration: "1_3_days",
  severity: "7",
  worsening: "worsening",
  symptoms: ["upper abdomen"],
  associatedSymptoms: ["nausea_vomiting"],
  riskIndicators: [],
  answers: [],
};

describe("mock AI provider", () => {
  it("returns InsufficientInformation when severity is missing and few answers were given", () => {
    const provider = new MockAIProvider();
    return provider
      .assess({ ...BASE_INPUT, severity: "", answers: [], associatedSymptoms: [], symptoms: [] })
      .then((result) => {
        expect(result.failed).toBe(false);
        expect(result.output?.suggestedUrgency).toBe("InsufficientInformation");
        expect(result.output?.confidence).toBeLessThan(0.5);
      });
  });

  it("produces output that always validates against the strict output schema", async () => {
    const provider = new MockAIProvider();
    const result = await provider.assess(BASE_INPUT);
    expect(result.failed).toBe(false);
    const parsed = aiAssessmentOutputSchema.safeParse(result.output);
    expect(parsed.success).toBe(true);
  });

  it("increases suggested urgency as severity and worsening increase", async () => {
    const provider = new MockAIProvider();
    const representativeAnswers = BASE_INPUT.answers.length > 0 ? BASE_INPUT.answers : [
      { questionId: "core_duration", questionText: "Duration", answerType: "single_select" as const, value: "1_3_days" },
      { questionId: "core_progression", questionText: "Progression", answerType: "single_select" as const, value: "worsening" },
    ];
    const mild = await provider.assess({
      ...BASE_INPUT,
      severity: "2",
      worsening: "improving",
      associatedSymptoms: [],
      riskIndicators: [],
      answers: representativeAnswers,
    });
    const severe = await provider.assess({
      ...BASE_INPUT,
      severity: "9",
      worsening: "worsening",
      associatedSymptoms: ["nausea_vomiting", "fever"],
      riskIndicators: ["Blood in vomit or stool"],
      answers: representativeAnswers,
    });

    const order = { Routine: 1, Priority: 2, Urgent: 3, Emergency: 4, InsufficientInformation: 0 };
    expect(order[severe.output!.suggestedUrgency]).toBeGreaterThan(order[mild.output!.suggestedUrgency]);
  });

  it("never returns a raw model output the schema rejects", () => {
    const invalid = { suggestedUrgency: "Super Urgent", summary: "x" };
    const parsed = aiAssessmentOutputSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });
});

describe("AI service (mock mode, default)", () => {
  it("runs end-to-end with AI_PROVIDER unset (defaults to mock) and returns validated output", async () => {
    delete process.env.AI_PROVIDER;
    const result = await runAIAssessment(BASE_INPUT);
    expect(result.failed).toBe(false);
    expect(result.output).not.toBeNull();
  });
});
