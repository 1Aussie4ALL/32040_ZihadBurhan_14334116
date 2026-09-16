import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AIAssessmentInput, AIProviderResult } from "@/types";
import type { AIProvider } from "./provider";
import { aiAssessmentOutputSchema } from "./schema";

// Optional real-model provider. Only ever imported from server-side code (server
// actions / route handlers) — the "server-only" import above makes it a build error
// to accidentally pull this into a client bundle, which is how ANTHROPIC_API_KEY
// stays out of the browser (section 22).

const SYSTEM_PROMPT = `You are a decision-support assistant for a healthcare APPOINTMENT REQUEST triage system.

You do not diagnose. You do not recommend treatment. You only assess how urgently a
patient's appointment REQUEST should be reviewed by a human clinician, based on the
structured information provided.

You will receive structured JSON describing a patient's reported concern, answers to
adaptive intake questions, and any risk indicators already identified. Deterministic
safety rules have already run separately and take precedence over anything you say —
your assessment is one input among several, always reviewed by a human.

Respond with ONLY a single JSON object, no prose before or after it, matching exactly:
{
  "suggestedUrgency": "Emergency" | "Urgent" | "Priority" | "Routine" | "InsufficientInformation",
  "summary": string,
  "reasoning": string[],
  "riskIndicators": string[],
  "missingInformation": string[],
  "recommendedClinicianType": string,
  "recommendedTimeframe": string,
  "confidence": number between 0 and 1
}

Use "InsufficientInformation" when the structured answers are too sparse or contradictory
to safely estimate urgency. Never claim diagnostic certainty. Never state a specific
medical condition as fact.`;

export class ClaudeAIProvider implements AIProvider {
  readonly name = "claude" as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async assess(input: AIAssessmentInput): Promise<AIProviderResult> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: JSON.stringify(input, null, 2) }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        return { failed: true, output: null, failureReason: "No text content returned by the model." };
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { failed: true, output: null, failureReason: "Response did not contain a JSON object." };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return { failed: true, output: null, failureReason: "Response was not valid JSON." };
      }

      const validated = aiAssessmentOutputSchema.safeParse(parsed);
      if (!validated.success) {
        return {
          failed: true,
          output: null,
          failureReason: `Response failed schema validation: ${validated.error.message}`,
        };
      }

      return { failed: false, output: validated.data };
    } catch (error) {
      return {
        failed: true,
        output: null,
        failureReason: error instanceof Error ? error.message : "Unknown AI provider error.",
      };
    }
  }
}
