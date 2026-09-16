import { describe, it, expect } from "vitest";
import { getInitialQuestions, getNextQuestion, isQuestioningComplete, getRelevantQuestions } from "@/lib/questions/engine";

describe("adaptive questioning engine", () => {
  it("includes core questions plus base category questions in the initial set", () => {
    const initial = getInitialQuestions("cardiovascular");
    const ids = initial.map((q) => q.questionId);
    expect(ids).toContain("core_duration");
    expect(ids).toContain("core_severity");
    expect(ids).toContain("cv_chest_character");
    // follow-up questions must NOT be in the initial set
    expect(ids).not.toContain("cv_sweating");
    expect(ids).not.toContain("cv_fainting");
  });

  it("does not include a different category's questions", () => {
    const initial = getInitialQuestions("cardiovascular");
    const ids = initial.map((q) => q.questionId);
    expect(ids).not.toContain("abd_location");
  });

  it("dynamically unlocks a follow-up question only once its trigger condition is met", () => {
    const withoutRadiation = getRelevantQuestions("cardiovascular", { cv_radiates: false });
    expect(withoutRadiation.map((q) => q.questionId)).not.toContain("cv_sweating");

    const withRadiation = getRelevantQuestions("cardiovascular", { cv_radiates: true });
    expect(withRadiation.map((q) => q.questionId)).toContain("cv_sweating");
  });

  it("unlocks cv_fainting via a high severity answer even without a breathing-difficulty trigger", () => {
    const relevant = getRelevantQuestions("cardiovascular", { core_severity: 8, cv_breathing_difficulty: false });
    expect(relevant.map((q) => q.questionId)).toContain("cv_fainting");
  });

  it("walks through the question queue in order via getNextQuestion and terminates", () => {
    const asked: string[] = [];
    let answers: Record<string, string | number | boolean | string[]> = {};
    let iterations = 0;

    while (!isQuestioningComplete("skin", answers, asked) && iterations < 50) {
      const next = getNextQuestion("skin", answers, asked);
      expect(next).not.toBeNull();
      if (!next) break;
      // Answer every question with a "positive"/representative value so follow-ups unlock.
      const value =
        next.answerType === "boolean"
          ? true
          : next.answerType === "scale"
            ? 5
            : next.answerType === "multi_select"
              ? [next.options?.[0]?.value ?? "none"]
              : next.answerType === "single_select"
                ? (next.options?.[0]?.value ?? "")
                : "some text";
      answers = { ...answers, [next.questionId]: value };
      asked.push(next.questionId);
      iterations += 1;
    }

    expect(iterations).toBeLessThan(50); // must terminate, not loop forever
    expect(isQuestioningComplete("skin", answers, asked)).toBe(true);
    expect(getNextQuestion("skin", answers, asked)).toBeNull();
  });

  it("never re-asks a question already in the asked list", () => {
    const asked = ["core_duration"];
    const next = getNextQuestion("respiratory", {}, asked);
    expect(next?.questionId).not.toBe("core_duration");
  });
});
