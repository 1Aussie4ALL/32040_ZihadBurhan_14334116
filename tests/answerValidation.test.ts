import { describe, it, expect } from "vitest";
import { validateAnswers } from "@/lib/validation/answers";
import { getRelevantQuestions, scopeAnswersToCategory } from "@/lib/questions/engine";
import { evaluateSafetyRules, computeSafetyFloor } from "@/lib/safety/engine";

describe("answer value validation", () => {
  it("accepts a well-formed answer set unchanged", () => {
    const result = validateAnswers("cardiovascular", {
      core_duration: "under_24h",
      core_severity: 8,
      core_progression: "worsening",
      core_associated_symptoms: ["dizziness"],
      core_functional_impact: true,
      cv_radiates: true,
      cv_sweating: true,
    });

    expect(result.invalid).toEqual([]);
    expect(result.dropped).toEqual([]);
    expect(result.answers.core_severity).toBe(8);
    expect(result.answers.cv_sweating).toBe(true);
  });

  it("rejects a scale answer outside the question's declared range", () => {
    // Without this guard a tampered client could post an extreme severity that the
    // AI scoring layer would treat as a genuine high-severity presentation.
    const result = validateAnswers("abdominal", { core_severity: 999 });

    expect(result.invalid.map((i) => i.questionId)).toContain("core_severity");
    expect(result.answers.core_severity).toBeUndefined();
  });

  it("rejects a scale answer that is not a whole number or not a number at all", () => {
    expect(validateAnswers("abdominal", { core_severity: 4.5 }).invalid).toHaveLength(1);
    expect(validateAnswers("abdominal", { core_severity: "8" }).invalid).toHaveLength(1);
    expect(validateAnswers("abdominal", { core_severity: -1 }).invalid).toHaveLength(1);
  });

  it("rejects a boolean red-flag answer sent as a string", () => {
    // A safety rule compares against boolean `true`; the string "true" would never
    // match, so a coerced value could silently suppress an emergency rule.
    const result = validateAnswers("cardiovascular", { cv_radiates: "true" });
    expect(result.invalid.map((i) => i.questionId)).toContain("cv_radiates");
  });

  it("rejects select answers that were never offered as options", () => {
    expect(validateAnswers("abdominal", { core_duration: "last_century" }).invalid).toHaveLength(1);
    expect(
      validateAnswers("abdominal", { core_associated_symptoms: ["fever", "not_an_option"] }).invalid,
    ).toHaveLength(1);
  });

  it("drops answers belonging to another complaint category instead of failing", () => {
    // Legitimate: the wizard keeps answers when a patient goes back and changes
    // category, so this is a normal state, not tampering.
    const result = validateAnswers("musculoskeletal", {
      core_severity: 5,
      cv_radiates: true,
      cv_sweating: true,
    });

    expect(result.invalid).toEqual([]);
    expect(result.dropped).toEqual(expect.arrayContaining(["cv_radiates", "cv_sweating"]));
    expect(result.answers).toEqual({ core_severity: 5 });
  });

  it("drops answers for question ids that do not exist in the question bank", () => {
    const result = validateAnswers("skin", { not_a_real_question: "anything" });
    expect(result.dropped).toContain("not_a_real_question");
    expect(result.answers).toEqual({});
  });
});

describe("category scoping of questions and safety rules", () => {
  it("never asks another category's follow-up question, even when a generic trigger matches", () => {
    // cv_sweating / cv_fainting unlock on `core_severity >= 7` with no category check
    // of their own, so scoping is what keeps them out of an abdominal consultation.
    const ids = getRelevantQuestions("abdominal", { core_severity: 8 }).map((q) => q.questionId);

    expect(ids).not.toContain("cv_sweating");
    expect(ids).not.toContain("cv_fainting");
    expect(ids).toContain("abd_location");
    expect(ids).toContain("core_severity");
  });

  it("still unlocks a follow-up within its own category", () => {
    const ids = getRelevantQuestions("cardiovascular", { core_severity: 8 }).map((q) => q.questionId);
    expect(ids).toContain("cv_fainting");
  });

  it("does not fire another category's emergency rule from stale answers", () => {
    // Patient began as cardiovascular, answered the cardiac red flags, then went back
    // and changed the category. Those answers must not resolve an ankle injury to
    // Emergency via the cardiac warning cluster.
    const stale = { core_severity: 5, cv_radiates: true, cv_sweating: true, msk_mechanism: "sports" };

    const scoped = scopeAnswersToCategory("musculoskeletal", stale);
    const floor = computeSafetyFloor(evaluateSafetyRules("musculoskeletal", scoped));

    expect(floor.urgencyFloor).toBeNull();
    expect(floor.triggeredRules).toEqual([]);
  });

  it("still fires the cardiac rule when the category genuinely is cardiovascular", () => {
    const answers = { core_severity: 5, cv_radiates: true, cv_sweating: true };
    const scoped = scopeAnswersToCategory("cardiovascular", answers);
    const floor = computeSafetyFloor(evaluateSafetyRules("cardiovascular", scoped));

    expect(floor.urgencyFloor).toBe("Emergency");
    expect(floor.triggeredRules.map((r) => r.ruleId)).toContain("SR-002-CARDIAC-WARNING-CLUSTER");
  });
});
