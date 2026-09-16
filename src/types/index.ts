// Central domain types shared across the app: data layer, triage engine, AI layer,
// patient UI, and clinician UI all import from here rather than redefining shapes.

export const ALL_URGENCY_LEVELS = [
  "Emergency",
  "Urgent",
  "Priority",
  "Routine",
  "InsufficientInformation",
] as const;

export type UrgencyLevel = (typeof ALL_URGENCY_LEVELS)[number];

// Ordinal ranking used for under/over-triage comparison in the evaluation framework.
// InsufficientInformation is deliberately not on the same clinical-severity scale as
// the others (it means "we don't know", not "this is mild") so it is ranked lowest.
export const URGENCY_ORDER: Record<UrgencyLevel, number> = {
  InsufficientInformation: 0,
  Routine: 1,
  Priority: 2,
  Urgent: 3,
  Emergency: 4,
};

export type ComplaintCategory =
  | "respiratory"
  | "cardiovascular"
  | "abdominal"
  | "musculoskeletal"
  | "skin"
  | "neurological"
  | "mental_wellbeing"
  | "fever_infection"
  | "injury"
  | "medication"
  | "general_consultation"
  | "other";

// ---------------------------------------------------------------------------
// Adaptive questioning engine
// ---------------------------------------------------------------------------

export type AnswerType = "boolean" | "scale" | "single_select" | "multi_select" | "text";

export interface QuestionOption {
  value: string;
  label: string;
}

export type AnswerValue = string | number | boolean | string[];

/** One check used to decide whether a question/rule should activate. */
export interface ConditionCheck {
  /** questionId being inspected, or the literal "category" for the complaint category. */
  questionId: string;
  equals?: AnswerValue;
  in?: AnswerValue[];
  /** true if the answer is a non-empty / true-ish value (used for booleans and multi-selects). */
  truthy?: boolean;
  /** for scale answers: answer >= this value. */
  gte?: number;
}

export interface TriggerCondition {
  operator: "AND" | "OR";
  checks: ConditionCheck[];
}

export interface QuestionDefinition {
  questionId: string;
  /** "core" questions are part of the initial 8–10 asked to everyone. */
  category: ComplaintCategory | "core";
  questionText: string;
  helperText?: string;
  answerType: AnswerType;
  options?: QuestionOption[];
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: { min: string; max: string };
  /** If present, this question is only included when the condition evaluates true. */
  triggerConditions?: TriggerCondition;
  /** If true, specific answers to this question feed the deterministic safety layer. */
  redFlag?: boolean;
  /** Follow-up questionIds unlocked by an answer to this question. */
  followUpQuestions?: string[];
  required?: boolean;
}

export interface AnsweredQuestion {
  questionId: string;
  questionText: string;
  answerType: AnswerType;
  value: AnswerValue;
}

export type AnswerMap = Record<string, AnswerValue>;

// ---------------------------------------------------------------------------
// Deterministic safety rules (Layer 1)
// ---------------------------------------------------------------------------

export interface SafetyRuleDefinition {
  ruleId: string;
  description: string;
  trigger: TriggerCondition;
  severity: "emergency" | "urgent";
  result: UrgencyLevel;
  patientMessage: string;
  clinicianFlag: string;
  explanation: string;
}

export interface SafetyRuleEvaluation {
  ruleId: string;
  description: string;
  triggered: boolean;
  severity: "emergency" | "urgent";
  result: UrgencyLevel;
  explanation: string;
  patientMessage: string;
  clinicianFlag: string;
}

// ---------------------------------------------------------------------------
// AI service layer
// ---------------------------------------------------------------------------

export interface AIAssessmentInput {
  primaryConcern: string;
  category: ComplaintCategory;
  duration: string;
  severity: string;
  worsening: string;
  symptoms: string[];
  associatedSymptoms: string[];
  riskIndicators: string[];
  answers: AnsweredQuestion[];
}

export interface AIAssessmentOutput {
  suggestedUrgency: UrgencyLevel;
  summary: string;
  reasoning: string[];
  riskIndicators: string[];
  missingInformation: string[];
  recommendedClinicianType: string;
  recommendedTimeframe: string;
  confidence: number; // 0–1
}

export type AIProviderName = "mock" | "claude";

export interface AIProviderResult {
  output: AIAssessmentOutput | null;
  /** True if the provider could not be reached / returned an invalid response. */
  failed: boolean;
  failureReason?: string;
}

// ---------------------------------------------------------------------------
// Final triage result (safety rules + AI + application logic)
// ---------------------------------------------------------------------------

export type TriageSource = "safety_rule" | "ai" | "ai_unavailable_fallback";

export interface ClinicianExplanation {
  triggeredDeterministicRules: string[];
  majorAssessmentFactors: string[];
  missingInformation: string[];
  aiRecommendation: string;
  finalApplicationDecision: string;
}

export interface TriageResult {
  urgencyLevel: UrgencyLevel;
  reasoningSummary: string[];
  triggeredRules: SafetyRuleEvaluation[];
  riskIndicators: string[];
  missingInformation: string[];
  recommendedTimeframe: string;
  recommendedClinicianType: string;
  aiSummary: string;
  aiConfidence: number;
  requiresHumanReview: true;
  finalSource: TriageSource;
  clinicianExplanation: ClinicianExplanation;
}

// ---------------------------------------------------------------------------
// Doctors & appointments
// ---------------------------------------------------------------------------

export interface DoctorSeed {
  id: string;
  name: string;
  specialty: string;
  qualifications: string;
  areasOfInterest: string[];
  clinicLocation: string;
  bio: string;
  avatarInitials: string;
  avatarColor: string;
  /** Categories this doctor is recommended for by the clinician-matching logic. */
  suitableFor: ComplaintCategory[];
}

export interface AppointmentSlotView {
  id: string;
  doctorId: string;
  startTime: string; // ISO 8601
  durationMinutes: number;
}

// ---------------------------------------------------------------------------
// Patient-facing booking form
// ---------------------------------------------------------------------------

export type InsuranceType = "medicare" | "private" | "self_funded" | "unsure";

export interface PatientDetailsInput {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // yyyy-mm-dd
  sex?: "female" | "male" | "intersex" | "prefer_not_to_say";
  phone: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Evaluation framework (section 27)
// ---------------------------------------------------------------------------

export interface PatientScenario {
  scenarioId: string;
  description: string;
  category: ComplaintCategory;
  concernText: string;
  answers: AnswerMap;
  expectedUrgency: UrgencyLevel;
}

export interface ScenarioRunResult {
  scenarioId: string;
  scenarioDescription: string;
  expectedUrgency: UrgencyLevel;
  systemUrgency: UrgencyLevel;
  correct: boolean;
  underTriaged: boolean;
  overTriaged: boolean;
  triggeredRules: string[];
  aiResult: AIAssessmentOutput | null;
  finalResult: TriageResult;
}

export interface EvaluationSummary {
  runId?: string;
  runAt: string;
  totalScenarios: number;
  correctCount: number;
  accuracy: number;
  underTriageCount: number;
  underTriageRate: number;
  overTriageCount: number;
  overTriageRate: number;
  confusionMatrix: Record<string, Record<string, number>>; // expected -> actual -> count
  results: ScenarioRunResult[];
}
