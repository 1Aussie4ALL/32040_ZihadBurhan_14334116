import { QUESTION_BANK, getQuestionById } from "@/data/questions";
import type {
  AnswerMap,
  AnswerValue,
  ComplaintCategory,
  ConditionCheck,
  QuestionDefinition,
  TriggerCondition,
} from "@/types";

/** questionId -> answer, plus the pseudo-key "category" used by trigger conditions. */
type EngineContext = Record<string, AnswerValue | ComplaintCategory | undefined>;

function buildContext(category: ComplaintCategory, answers: AnswerMap): EngineContext {
  return { category, ...answers };
}

function isNoneish(value: AnswerValue | undefined): boolean {
  if (value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0 || (value.length === 1 && value[0] === "none");
  if (typeof value === "string") return value.trim().length === 0;
  return false;
}

function evaluateCheck(check: ConditionCheck, context: EngineContext): boolean {
  const value = context[check.questionId];

  if (check.equals !== undefined) {
    if (Array.isArray(value)) return value.includes(check.equals as string);
    return value === check.equals;
  }
  if (check.in !== undefined) {
    if (Array.isArray(value)) return value.some((v) => (check.in as AnswerValue[]).includes(v));
    return value !== undefined && (check.in as AnswerValue[]).includes(value as AnswerValue);
  }
  if (check.gte !== undefined) {
    return typeof value === "number" && value >= check.gte;
  }
  if (check.truthy !== undefined) {
    const truthy = !isNoneish(value as AnswerValue | undefined);
    return check.truthy ? truthy : !truthy;
  }
  return false;
}

export function evaluateTrigger(trigger: TriggerCondition | undefined, context: EngineContext): boolean {
  if (!trigger || trigger.checks.length === 0) return true;
  const results = trigger.checks.map((check) => evaluateCheck(check, context));
  return trigger.operator === "AND" ? results.every(Boolean) : results.some(Boolean);
}

/** A question is in scope for a complaint category if it is a shared "core" question
 * or belongs to that category. Several follow-ups are unlocked by a generic answer
 * (e.g. `core_severity >= 7`) rather than by a category check, so without this guard
 * a high-severity abdominal complaint would be asked the *cardiovascular* sweating
 * and fainting follow-ups, and stale answers left behind when a patient goes back
 * and changes their category could fire another category's safety rules. */
function isInCategoryScope(question: QuestionDefinition, category: ComplaintCategory): boolean {
  return question.category === "core" || question.category === category;
}

/** A "base" question belongs to the initial 8–10 set: core questions, or a category
 * question whose only condition is the category match itself (no prior answer needed). */
function isBaseQuestion(question: QuestionDefinition): boolean {
  if (question.category === "core") return true;
  if (!question.triggerConditions) return false;
  return question.triggerConditions.checks.every((c) => c.questionId === "category");
}

export function isQuestionRequired(question: QuestionDefinition): boolean {
  if (question.required) return true;
  return question.answerType !== "text";
}

/** The initial question set shown for a category, before any answers exist. */
export function getInitialQuestions(category: ComplaintCategory): QuestionDefinition[] {
  const context = buildContext(category, {});
  return QUESTION_BANK.filter((q) => isBaseQuestion(q) && evaluateTrigger(q.triggerConditions, context));
}

/** Every question currently relevant given the answers collected so far — base
 * questions plus any dynamically unlocked follow-ups. Recompute after every answer. */
export function getRelevantQuestions(category: ComplaintCategory, answers: AnswerMap): QuestionDefinition[] {
  const context = buildContext(category, answers);
  return QUESTION_BANK.filter(
    (q) => isInCategoryScope(q, category) && evaluateTrigger(q.triggerConditions, context),
  );
}

/** Drops any answer that does not belong to this complaint category's question set.
 * The booking wizard keeps collected answers when a patient goes back and changes
 * their category, so the raw answer map can legitimately contain another category's
 * answers — which must not reach the safety-rule engine, the AI input, or storage. */
export function scopeAnswersToCategory(category: ComplaintCategory, answers: AnswerMap): AnswerMap {
  const scoped: AnswerMap = {};
  for (const [questionId, value] of Object.entries(answers)) {
    const question = getQuestionById(questionId);
    if (question && isInCategoryScope(question, category)) {
      scoped[questionId] = value;
    }
  }
  return scoped;
}

/** Ordered queue: base questions first (in bank order), then any follow-ups unlocked
 * by answers so far that haven't been asked yet. Used by the patient-facing flow to
 * decide "what's the next question". */
export function getNextQuestion(
  category: ComplaintCategory,
  answers: AnswerMap,
  askedQuestionIds: string[],
): QuestionDefinition | null {
  const relevant = getRelevantQuestions(category, answers);
  const askedSet = new Set(askedQuestionIds);
  const next = relevant.find((q) => !askedSet.has(q.questionId));
  return next ?? null;
}

export function isQuestioningComplete(
  category: ComplaintCategory,
  answers: AnswerMap,
  askedQuestionIds: string[],
): boolean {
  return getNextQuestion(category, answers, askedQuestionIds) === null;
}

/** For the clinician explanation view: which questions were asked because of a
 * specific prior answer (used to explain "why was this asked"). */
export function explainWhyAsked(question: QuestionDefinition): string {
  if (isBaseQuestion(question)) {
    return question.category === "core"
      ? "Asked of every patient as part of the standard initial questions."
      : `Asked because the complaint category was "${question.category.replace(/_/g, " ")}".`;
  }
  const trigger = question.triggerConditions;
  if (!trigger) return "Asked as part of the standard question set.";
  const parts = trigger.checks.map((c) => {
    const q = getQuestionById(c.questionId);
    const label = q?.questionText ?? c.questionId;
    if (c.equals !== undefined) return `"${label}" = ${String(c.equals)}`;
    if (c.in !== undefined) return `"${label}" in [${c.in.join(", ")}]`;
    if (c.gte !== undefined) return `"${label}" >= ${c.gte}`;
    if (c.truthy !== undefined) return `"${label}" was answered`;
    return label;
  });
  return `Follow-up question, unlocked because ${parts.join(trigger.operator === "AND" ? " and " : " or ")}.`;
}

/** Renders a raw answer value as a human-readable string for AI input, the
 * clinician summary, and any other display context — resolves option values to
 * their labels rather than showing raw codes like "under_24h". */
export function formatAnswerValue(question: QuestionDefinition, value: AnswerValue): string {
  if (question.answerType === "boolean") {
    return value ? "Yes" : "No";
  }
  if (question.answerType === "scale") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((v) => optionLabel(question, v)).join(", ");
  }
  if (question.options) {
    return optionLabel(question, value as string);
  }
  return String(value);
}

function optionLabel(question: QuestionDefinition, value: string): string {
  return question.options?.find((o) => o.value === value)?.label ?? value;
}

export { QUESTION_BANK, getQuestionById };
