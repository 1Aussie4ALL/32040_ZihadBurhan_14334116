import { z } from "zod";
import { ALL_URGENCY_LEVELS } from "@/types";

// The AI must return strictly structured JSON matching this schema (section 9).
// Nothing downstream trusts an AI response until it passes this validation — an
// invalid or malformed response is treated exactly like a provider failure
// (see src/lib/ai/aiService.ts), never silently coerced into something usable.

export const urgencyLevelSchema = z.enum(ALL_URGENCY_LEVELS);

export const aiAssessmentOutputSchema = z.object({
  suggestedUrgency: urgencyLevelSchema,
  summary: z.string().min(1).max(1000),
  reasoning: z.array(z.string().min(1)).max(15),
  riskIndicators: z.array(z.string().min(1)).max(15),
  missingInformation: z.array(z.string().min(1)).max(15),
  recommendedClinicianType: z.string().min(1).max(200),
  recommendedTimeframe: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

export type ValidatedAIAssessmentOutput = z.infer<typeof aiAssessmentOutputSchema>;
