import { SAFETY_RULES } from "@/data/safetyRules";
import type {
  AnswerMap,
  AnswerValue,
  ComplaintCategory,
  ConditionCheck,
  SafetyRuleEvaluation,
  TriggerCondition,
  UrgencyLevel,
} from "@/types";

// Layer 1 of the triage architecture (section 7). This module is deliberately free of
// any AI dependency: it is pure, synchronous, and fully deterministic so that the
// same answers always produce the same safety outcome, and so it can run even if the
// AI service is completely unavailable (section 29).

type EngineContext = Record<string, AnswerValue | ComplaintCategory | undefined>;

function buildContext(category: ComplaintCategory, answers: AnswerMap): EngineContext {
  return { category, ...answers };
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
    const isSet = value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0);
    return check.truthy ? isSet : !isSet;
  }
  return false;
}

function evaluateTrigger(trigger: TriggerCondition, context: EngineContext): boolean {
  const results = trigger.checks.map((c) => evaluateCheck(c, context));
  return trigger.operator === "AND" ? results.every(Boolean) : results.some(Boolean);
}

/** Evaluates every safety rule against the current answers. Returns one entry per
 * rule (triggered true/false) so the full picture is available for clinician review
 * and auditing, even though only triggered rules are normally persisted. */
export function evaluateSafetyRules(
  category: ComplaintCategory,
  answers: AnswerMap,
): SafetyRuleEvaluation[] {
  const context = buildContext(category, answers);
  return SAFETY_RULES.map((rule) => {
    const triggered = evaluateTrigger(rule.trigger, context);
    return {
      ruleId: rule.ruleId,
      description: rule.description,
      triggered,
      severity: rule.severity,
      result: rule.result,
      explanation: rule.explanation,
      patientMessage: rule.patientMessage,
      clinicianFlag: rule.clinicianFlag,
    };
  });
}

export interface SafetyFloor {
  /** The minimum urgency the final result must never fall below, or null if no
   * safety rule fired and the AI/application logic is free to decide. */
  urgencyFloor: UrgencyLevel | null;
  triggeredRules: SafetyRuleEvaluation[];
  isEmergency: boolean;
}

/** Computes the safety floor from the full rule evaluation. Emergency rules always
 * win; otherwise the highest-severity triggered "urgent" rule sets an Urgent floor. */
export function computeSafetyFloor(evaluations: SafetyRuleEvaluation[]): SafetyFloor {
  const triggeredRules = evaluations.filter((e) => e.triggered);
  const isEmergency = triggeredRules.some((r) => r.severity === "emergency");
  const isUrgent = triggeredRules.some((r) => r.severity === "urgent");

  const urgencyFloor: UrgencyLevel | null = isEmergency ? "Emergency" : isUrgent ? "Urgent" : null;

  return { urgencyFloor, triggeredRules, isEmergency };
}
