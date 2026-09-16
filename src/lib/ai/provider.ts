import type { AIAssessmentInput, AIProviderName, AIProviderResult } from "@/types";

/** Common interface every AI provider must implement. The rest of the app only ever
 * talks to this interface, never to a specific provider — see aiService.ts. */
export interface AIProvider {
  readonly name: AIProviderName;
  assess(input: AIAssessmentInput): Promise<AIProviderResult>;
}
