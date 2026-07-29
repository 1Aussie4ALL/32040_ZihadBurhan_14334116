"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { apiFetch, ApiError } from "@/lib/api";

type NextQuestion = {
  done: boolean;
  question_key?: string;
  question_text?: string;
  input_type?: "choice" | "boolean" | "number" | "text";
  options?: string[];
  reason?: string;
  questions_answered: number;
  max_questions: number;
};

export default function QuestionsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [question, setQuestion] = useState<NextQuestion | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadNext() {
    setLoading(true);
    setError(null);
    try {
      const next = await apiFetch<NextQuestion>(`/api/v1/appointment-requests/${id}/next-question`);
      setQuestion(next);
      setAnswer("");
      if (next.done) {
        router.push(`/requests/${id}/review`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to load the next question.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAnswer(e: React.FormEvent) {
    e.preventDefault();
    if (!question?.question_key) return;
    setError(null);
    let value: string | number | boolean = answer;
    if (question.input_type === "boolean") value = answer === "yes";
    if (question.input_type === "number") value = Number(answer);
    setLoading(true);
    try {
      await apiFetch(`/api/v1/appointment-requests/${id}/responses`, {
        method: "POST",
        body: JSON.stringify({ question_key: question.question_key, answer_value: value }),
      });
      await loadNext();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to save your answer.");
      setLoading(false);
    }
  }

  if (loading && !question) {
    return <main><p className="text-text-secondary">Loading…</p></main>;
  }

  if (!question || question.done) {
    return <main><p className="text-text-secondary">Preparing your review…</p></main>;
  }

  const progress = question.max_questions
    ? Math.round((question.questions_answered / question.max_questions) * 100)
    : 0;

  return (
    <main className="space-y-6">
      <div>
        <div className="mb-1 flex justify-between text-xs text-text-muted">
          <span>Follow-up question {question.questions_answered + 1}</span>
          <span>{progress}% through</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-bg-secondary" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <form onSubmit={handleAnswer} className="space-y-4 rounded-card border border-border bg-bg-surface p-6 shadow-sm" noValidate>
        {error && (
          <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
            {error}
          </div>
        )}
        <h1 className="text-xl font-semibold text-text-primary">{question.question_text}</h1>
        <p className="text-xs text-text-muted">{question.reason}</p>

        {question.input_type === "choice" && (
          <div className="flex flex-wrap gap-2">
            {question.options?.map((opt) => (
              <label key={opt} className={`focus-ring cursor-pointer rounded-button border px-4 py-2 text-sm ${answer === opt ? "border-primary bg-primary-light text-primary" : "border-border text-text-secondary"}`}>
                <input type="radio" name="opt" value={opt} className="sr-only" checked={answer === opt} onChange={() => setAnswer(opt)} />
                {opt}
              </label>
            ))}
          </div>
        )}

        {question.input_type === "boolean" && (
          <div className="flex gap-2">
            {["yes", "no"].map((opt) => (
              <label key={opt} className={`focus-ring cursor-pointer rounded-button border px-4 py-2 text-sm ${answer === opt ? "border-primary bg-primary-light text-primary" : "border-border text-text-secondary"}`}>
                <input type="radio" name="opt" value={opt} className="sr-only" checked={answer === opt} onChange={() => setAnswer(opt)} />
                {opt === "yes" ? "Yes" : "No"}
              </label>
            ))}
          </div>
        )}

        {question.input_type === "number" && (
          <input
            type="number"
            min={0}
            required
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="focus-ring w-full rounded-input border border-border px-3 py-2 text-sm"
          />
        )}

        <Button type="submit" disabled={loading || !answer}>{loading ? "Saving…" : "Next"}</Button>
      </form>

      <p className="text-xs text-text-muted">
        If this were a real emergency, this prototype would not be an appropriate way to seek help — call Triple Zero (000).
      </p>
    </main>
  );
}
