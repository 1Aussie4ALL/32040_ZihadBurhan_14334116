import "server-only";
import type { AIAssessmentInput, AIProviderResult } from "@/types";
import { aiAssessmentOutputSchema } from "./schema";
import { MockAIProvider } from "./mockProvider";
import { ClaudeAIProvider } from "./claudeProvider";
import type { AIProvider } from "./provider";

// AIService
// ├── MockAIProvider   (default — deterministic, free, no network)
// ├── ClaudeAIProvider (optional — real model, requires ANTHROPIC_API_KEY)
// └── (future providers implement the same AIProvider interface)
//
// This is the only module the rest of the app calls into for AI assessment. It
// selects the provider from AI_PROVIDER, re-validates whatever comes back against
// the output schema (even the mock provider's output — defence in depth), and turns
// any failure into a clean AIProviderResult rather than throwing, so a caller never
// has to guess whether it's safe to trust the output.

function selectProvider(): AIProvider {
  const providerName = (process.env.AI_PROVIDER || "mock").toLowerCase();

  if (providerName === "claude") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      return new ClaudeAIProvider(apiKey);
    }
    // Misconfiguration (claude selected but no key) — fall back to mock rather than
    // crash the request path. This is a configuration issue, not an outage, but the
    // caller-facing behaviour should be identical: never make the app unusable.
  }
  return new MockAIProvider();
}

export async function runAIAssessment(input: AIAssessmentInput): Promise<AIProviderResult> {
  const provider = selectProvider();

  let result: AIProviderResult;
  try {
    result = await provider.assess(input);
  } catch (error) {
    return {
      failed: true,
      output: null,
      failureReason: error instanceof Error ? error.message : "AI provider threw an unexpected error.",
    };
  }

  if (result.failed || !result.output) {
    return result;
  }

  // Defence in depth: re-validate even a provider's own "success" output.
  const revalidated = aiAssessmentOutputSchema.safeParse(result.output);
  if (!revalidated.success) {
    return {
      failed: true,
      output: null,
      failureReason: `AI output failed schema validation: ${revalidated.error.message}`,
    };
  }

  return { failed: false, output: revalidated.data };
}
