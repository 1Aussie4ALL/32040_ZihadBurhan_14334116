"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Button } from "@/components/common/Button";
import { getNextQuestion, isQuestionRequired } from "@/lib/questions/engine";
import type { AnswerMap, AnswerValue, ComplaintCategory, QuestionDefinition } from "@/types";

export function QuestionFlow({
  category,
  initialAnswers,
  initialAskedIds,
  onBack,
  onComplete,
}: {
  category: ComplaintCategory;
  initialAnswers: AnswerMap;
  initialAskedIds: string[];
  onBack: () => void;
  onComplete: (answers: AnswerMap, askedIds: string[]) => void;
}) {
  const [answers, setAnswers] = useState<AnswerMap>(initialAnswers);
  const [askedIds, setAskedIds] = useState<string[]>(initialAskedIds);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = useMemo(
    () => getNextQuestion(category, answers, askedIds),
    [category, answers, askedIds],
  );

  const draft = currentQuestion ? answers[currentQuestion.questionId] : undefined;

  function setDraft(value: AnswerValue) {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.questionId]: value }));
    setError(null);
  }

  function handleBack() {
    if (askedIds.length === 0) {
      onBack();
      return;
    }
    setAskedIds((prev) => prev.slice(0, -1));
    setError(null);
  }

  function handleNext() {
    if (!currentQuestion) {
      onComplete(answers, askedIds);
      return;
    }
    const required = isQuestionRequired(currentQuestion);
    const answered =
      draft !== undefined && draft !== "" && !(Array.isArray(draft) && draft.length === 0);
    if (required && !answered) {
      setError("Please answer this question to continue.");
      return;
    }
    setAskedIds((prev) => [...prev, currentQuestion.questionId]);
    setError(null);
  }

  if (!currentQuestion) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">That&apos;s everything we need for now</h2>
          <p className="mt-1 text-sm text-muted">
            You answered {askedIds.length} question{askedIds.length === 1 ? "" : "s"}. Continue to see your
            appointment assessment.
          </p>
        </div>
        <div className="flex justify-between pt-2">
          <Button type="button" variant="outline" onClick={handleBack}>
            Back
          </Button>
          <Button type="button" onClick={handleNext}>
            See my assessment
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          Question {askedIds.length + 1}
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">{currentQuestion.questionText}</h2>
        {currentQuestion.helperText && <p className="mt-1 text-sm text-muted">{currentQuestion.helperText}</p>}
      </div>

      <QuestionInput question={currentQuestion} value={draft} onChange={setDraft} />

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button type="button" onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: QuestionDefinition;
  value: AnswerValue | undefined;
  onChange: (value: AnswerValue) => void;
}) {
  if (question.answerType === "boolean") {
    return (
      <div className="flex gap-3" role="radiogroup" aria-label={question.questionText}>
        {[
          { label: "Yes", val: true },
          { label: "No", val: false },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={value === opt.val}
            onClick={() => onChange(opt.val)}
            className={clsx(
              "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
              value === opt.val
                ? "border-brand bg-brand-light text-brand-dark"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand/40",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.answerType === "scale") {
    const min = question.scaleMin ?? 0;
    const max = question.scaleMax ?? 10;
    const current = typeof value === "number" ? value : Math.round((min + max) / 2);
    return (
      <div>
        <input
          type="range"
          min={min}
          max={max}
          value={current}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-teal-700"
          aria-label={question.questionText}
        />
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{question.scaleLabels?.min ?? min}</span>
          <span className="text-base font-semibold text-brand-dark">{current}</span>
          <span>{question.scaleLabels?.max ?? max}</span>
        </div>
      </div>
    );
  }

  if (question.answerType === "single_select") {
    return (
      <div className="grid gap-2" role="radiogroup" aria-label={question.questionText}>
        {question.options?.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={value === opt.value}
            onClick={() => onChange(opt.value)}
            className={clsx(
              "rounded-lg border px-4 py-2.5 text-left text-sm font-medium transition-colors",
              value === opt.value
                ? "border-brand bg-brand-light text-brand-dark"
                : "border-slate-200 bg-white text-slate-700 hover:border-brand/40",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    );
  }

  if (question.answerType === "multi_select") {
    const selected = Array.isArray(value) ? value : [];
    function toggle(optValue: string) {
      if (optValue === "none") {
        onChange(["none"]);
        return;
      }
      const withoutNone = selected.filter((v) => v !== "none");
      const next = withoutNone.includes(optValue)
        ? withoutNone.filter((v) => v !== optValue)
        : [...withoutNone, optValue];
      onChange(next);
    }
    return (
      <div className="grid gap-2">
        {question.options?.map((opt) => {
          const checked = selected.includes(opt.value);
          return (
            <label
              key={opt.value}
              className={clsx(
                "flex cursor-pointer items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors",
                checked ? "border-brand bg-brand-light text-brand-dark" : "border-slate-200 bg-white text-slate-700 hover:border-brand/40",
              )}
            >
              <input
                type="checkbox"
                className="h-4 w-4 accent-teal-700"
                checked={checked}
                onChange={() => toggle(opt.value)}
              />
              {opt.label}
            </label>
          );
        })}
      </div>
    );
  }

  // text
  return (
    <textarea
      rows={3}
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
      value={typeof value === "string" ? value : ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Optional"
    />
  );
}
