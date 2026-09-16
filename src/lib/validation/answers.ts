import { getQuestionById } from "@/data/questions";
import { scopeAnswersToCategory } from "@/lib/questions/engine";
import type { AnswerMap, AnswerValue, ComplaintCategory, QuestionDefinition } from "@/types";

// Structured-answer guardrail (section 22).
//
// `answerMapSchema` in ./schemas.ts only proves the submitted object is a map of
// JSON-ish values. It cannot know that "core_severity" is a 0–10 scale, or that
// "core_progression" must be one of three option codes — so on its own it would let
// a tampered or buggy client post `core_severity: 999`, which the AI scoring layer
// would happily treat as an extreme presentation, or `cv_radiates: "yes"`, which a
// safety rule comparing against boolean `true` would silently fail to match.
//
// This module validates every answer against the question bank that produced it:
//   1. answers belonging to another complaint category are DROPPED (legitimate — the
//      booking wizard keeps answers when a patient goes back and changes category);
//   2. answers whose value does not fit their question's declared type/range are
//      REPORTED as invalid, and the caller rejects the whole submission rather than
//      guessing at what the patient meant.
//
// Dropping is safe; coercing is not. A silently coerced answer could move the final
// urgency in either direction, including downwards, which is the one thing the
// triage architecture must never allow to happen by accident.

const MAX_TEXT_ANSWER_LENGTH = 1000;

export interface InvalidAnswer {
  questionId: string;
  reason: string;
}

export interface AnswerValidationResult {
  /** Answers that are in scope for the category and valid for their question. */
  answers: AnswerMap;
  /** In-scope answers whose value did not fit the question definition. */
  invalid: InvalidAnswer[];
  /** Answers dropped because they belong to a different category or no known question. */
  dropped: string[];
}

function optionValues(question: QuestionDefinition): string[] {
  return (question.options ?? []).map((o) => o.value);
}

/** Checks one answer against its question definition. Returns null if valid. */
function checkAnswer(question: QuestionDefinition, value: AnswerValue): string | null {
  switch (question.answerType) {
    case "boolean":
      return typeof value === "boolean" ? null : "expected true or false";

    case "scale": {
      if (typeof value !== "number" || !Number.isFinite(value)) return "expected a number";
      if (!Number.isInteger(value)) return "expected a whole number";
      const min = question.scaleMin ?? 0;
      const max = question.scaleMax ?? 10;
      return value >= min && value <= max ? null : `expected a value between ${min} and ${max}`;
    }

    case "single_select": {
      if (typeof value !== "string") return "expected a single option value";
      const allowed = optionValues(question);
      return allowed.includes(value) ? null : "not one of the offered options";
    }

    case "multi_select": {
      if (!Array.isArray(value)) return "expected a list of option values";
      const allowed = optionValues(question);
      const unknown = value.filter((v) => typeof v !== "string" || !allowed.includes(v));
      return unknown.length === 0 ? null : "contains options that were not offered";
    }

    case "text":
      if (typeof value !== "string") return "expected text";
      return value.length <= MAX_TEXT_ANSWER_LENGTH
        ? null
        : `must be ${MAX_TEXT_ANSWER_LENGTH} characters or fewer`;

    default:
      return "unknown answer type";
  }
}

/**
 * Validates a raw answer map against the question bank for a given complaint
 * category. Out-of-scope answers are dropped; in-scope answers with an invalid
 * value are reported so the caller can reject the submission outright.
 */
export function validateAnswers(category: ComplaintCategory, answers: AnswerMap): AnswerValidationResult {
  const scoped = scopeAnswersToCategory(category, answers);
  const scopedIds = new Set(Object.keys(scoped));
  const dropped = Object.keys(answers).filter((id) => !scopedIds.has(id));

  const valid: AnswerMap = {};
  const invalid: InvalidAnswer[] = [];

  for (const [questionId, value] of Object.entries(scoped)) {
    const question = getQuestionById(questionId);
    if (!question) {
      // Unreachable in practice — scopeAnswersToCategory only keeps known questions.
      dropped.push(questionId);
      continue;
    }
    const problem = checkAnswer(question, value);
    if (problem) {
      invalid.push({ questionId, reason: problem });
      continue;
    }
    valid[questionId] = value;
  }

  return { answers: valid, invalid, dropped };
}
