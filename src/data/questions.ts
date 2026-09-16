import type { QuestionDefinition } from "@/types";

// Configurable question bank for the adaptive questioning engine (section 6).
// Nothing here is hardcoded into UI components — src/lib/questions/engine.ts reads
// this list and selects: all "core" questions, plus questions whose triggerConditions
// evaluate true against { category, ...answersSoFar }. These questions exist to
// triage an APPOINTMENT REQUEST, not to diagnose — wording is kept deliberately
// symptom/impact-focused rather than clinical.

export const QUESTION_BANK: QuestionDefinition[] = [
  // ---------------------------------------------------------------------
  // Core questions — asked for every complaint category
  // ---------------------------------------------------------------------
  {
    questionId: "core_duration",
    category: "core",
    questionText: "How long have you been experiencing this?",
    answerType: "single_select",
    required: true,
    options: [
      { value: "under_24h", label: "Less than 24 hours" },
      { value: "1_3_days", label: "1–3 days" },
      { value: "4_7_days", label: "4–7 days" },
      { value: "1_4_weeks", label: "1–4 weeks" },
      { value: "over_4_weeks", label: "More than 4 weeks" },
    ],
  },
  {
    questionId: "core_severity",
    category: "core",
    questionText: "On a scale of 0–10, how severe is it right now?",
    helperText: "0 is no discomfort at all, 10 is the worst you can imagine.",
    answerType: "scale",
    scaleMin: 0,
    scaleMax: 10,
    scaleLabels: { min: "0 – None", max: "10 – Worst possible" },
    required: true,
  },
  {
    questionId: "core_progression",
    category: "core",
    questionText: "Is it getting better, staying the same, or getting worse?",
    answerType: "single_select",
    required: true,
    options: [
      { value: "improving", label: "Improving" },
      { value: "same", label: "Staying the same" },
      { value: "worsening", label: "Getting worse" },
    ],
  },
  {
    questionId: "core_associated_symptoms",
    category: "core",
    questionText: "Are you experiencing any of these alongside your main concern?",
    answerType: "multi_select",
    options: [
      { value: "fever", label: "Fever or chills" },
      { value: "nausea_vomiting", label: "Nausea or vomiting" },
      { value: "dizziness", label: "Dizziness or light-headedness" },
      { value: "fatigue", label: "Unusual fatigue" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    questionId: "core_functional_impact",
    category: "core",
    questionText: "Is this affecting your ability to work, sleep, or manage daily activities?",
    answerType: "boolean",
    required: true,
  },
  {
    questionId: "core_recent_events",
    category: "core",
    questionText: "Has anything recent that might be related happened?",
    helperText: "For example: a new injury, a new medication, recent travel, or a recent illness.",
    answerType: "multi_select",
    options: [
      { value: "new_injury", label: "New injury" },
      { value: "new_medication", label: "New or changed medication" },
      { value: "recent_travel", label: "Recent travel" },
      { value: "recent_illness", label: "Recent illness" },
      { value: "none", label: "None of these" },
    ],
  },
  {
    questionId: "core_treatment_attempted",
    category: "core",
    questionText: "Have you already tried anything for this?",
    helperText: "For example: over-the-counter medication, rest, or first aid. Optional.",
    answerType: "text",
  },

  // ---------------------------------------------------------------------
  // Cardiovascular / chest
  // ---------------------------------------------------------------------
  {
    questionId: "cv_chest_character",
    category: "cardiovascular",
    questionText: "How would you describe the chest discomfort?",
    answerType: "single_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "cardiovascular" }] },
    options: [
      { value: "tightness_pressure", label: "Tightness or pressure" },
      { value: "sharp_stabbing", label: "Sharp or stabbing" },
      { value: "burning", label: "Burning" },
      { value: "dull_ache", label: "Dull ache" },
    ],
  },
  {
    questionId: "cv_breathing_difficulty",
    category: "cardiovascular",
    questionText: "Are you having any difficulty breathing?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "cardiovascular" }] },
    followUpQuestions: ["cv_fainting"],
  },
  {
    questionId: "cv_radiates",
    category: "cardiovascular",
    questionText: "Does the discomfort spread to your arm, jaw, neck, or back?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "cardiovascular" }] },
    followUpQuestions: ["cv_sweating"],
  },
  {
    questionId: "cv_sweating",
    category: "cardiovascular",
    questionText: "Have you had sudden sweating or nausea along with this?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: {
      operator: "OR",
      checks: [
        { questionId: "cv_radiates", equals: true },
        { questionId: "core_severity", gte: 7 },
      ],
    },
  },
  {
    questionId: "cv_fainting",
    category: "cardiovascular",
    questionText: "Have you fainted, or felt like you were about to faint?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: {
      operator: "OR",
      checks: [
        { questionId: "cv_breathing_difficulty", equals: true },
        { questionId: "core_severity", gte: 7 },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Respiratory
  // ---------------------------------------------------------------------
  {
    questionId: "resp_breathing_difficulty",
    category: "respiratory",
    questionText: "How would you rate your breathing difficulty?",
    answerType: "single_select",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "respiratory" }] },
    options: [
      { value: "none", label: "No difficulty" },
      { value: "mild", label: "Mild — noticeable but manageable" },
      { value: "moderate", label: "Moderate — hard to talk in full sentences" },
      { value: "severe", label: "Severe — struggling to breathe" },
    ],
    followUpQuestions: ["resp_lips_face_blue"],
  },
  {
    questionId: "resp_cough_type",
    category: "respiratory",
    questionText: "What best describes your cough, if any?",
    answerType: "single_select",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "respiratory" }] },
    options: [
      { value: "none", label: "No cough" },
      { value: "dry", label: "Dry cough" },
      { value: "productive", label: "Cough with phlegm" },
      { value: "blood", label: "Coughing up blood" },
    ],
  },
  {
    questionId: "resp_wheeze",
    category: "respiratory",
    questionText: "Any wheezing or noisy breathing?",
    answerType: "boolean",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "respiratory" }] },
  },
  {
    questionId: "resp_lips_face_blue",
    category: "respiratory",
    questionText: "Have your lips, face, or fingertips turned blue or grey?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: {
      operator: "OR",
      checks: [
        { questionId: "resp_breathing_difficulty", in: ["moderate", "severe"] },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Abdominal
  // ---------------------------------------------------------------------
  {
    questionId: "abd_location",
    category: "abdominal",
    questionText: "Where is the pain mainly located?",
    answerType: "single_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "abdominal" }] },
    options: [
      { value: "upper", label: "Upper abdomen" },
      { value: "lower", label: "Lower abdomen" },
      { value: "left_side", label: "Left side" },
      { value: "right_side", label: "Right side" },
      { value: "all_over", label: "All over" },
    ],
  },
  {
    questionId: "abd_vomiting",
    category: "abdominal",
    questionText: "Have you been vomiting?",
    answerType: "single_select",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "abdominal" }] },
    options: [
      { value: "none", label: "No" },
      { value: "occasional", label: "Occasionally" },
      { value: "persistent", label: "Persistent — can't keep fluids down" },
    ],
    followUpQuestions: ["abd_bleeding"],
  },
  {
    questionId: "abd_fever",
    category: "abdominal",
    questionText: "Do you have a fever with this pain?",
    answerType: "boolean",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "abdominal" }] },
  },
  {
    questionId: "abd_bleeding",
    category: "abdominal",
    questionText: "Any blood in vomit or stool, or unusual bleeding?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: {
      operator: "OR",
      checks: [
        { questionId: "abd_vomiting", equals: "persistent" },
        { questionId: "core_severity", gte: 7 },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Musculoskeletal
  // ---------------------------------------------------------------------
  {
    questionId: "msk_mechanism",
    category: "musculoskeletal",
    questionText: "How did this start?",
    answerType: "single_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "musculoskeletal" }] },
    options: [
      { value: "fall", label: "A fall" },
      { value: "sports", label: "Sports or exercise" },
      { value: "lifting", label: "Lifting or straining" },
      { value: "gradual", label: "Gradual onset, no clear cause" },
    ],
  },
  {
    questionId: "msk_deformity",
    category: "musculoskeletal",
    questionText: "Is there any visible deformity, or an open wound near the injury?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "musculoskeletal" }] },
    followUpQuestions: ["msk_numbness"],
  },
  {
    questionId: "msk_weight_bearing",
    category: "musculoskeletal",
    questionText: "Can you still move or put weight on the affected area?",
    answerType: "boolean",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "musculoskeletal" }] },
    followUpQuestions: ["msk_numbness"],
  },
  {
    questionId: "msk_numbness",
    category: "musculoskeletal",
    questionText: "Any numbness, tingling, or loss of movement below the injury?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: {
      operator: "OR",
      checks: [
        { questionId: "msk_deformity", equals: true },
        { questionId: "msk_weight_bearing", equals: false },
      ],
    },
  },

  // ---------------------------------------------------------------------
  // Skin
  // ---------------------------------------------------------------------
  {
    questionId: "skin_appearance",
    category: "skin",
    questionText: "What best describes the skin problem?",
    answerType: "single_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "skin" }] },
    options: [
      { value: "rash", label: "Rash" },
      { value: "swelling", label: "Lump or swelling" },
      { value: "wound", label: "Wound or cut" },
      { value: "discolouration", label: "Discolouration" },
      { value: "other", label: "Other" },
    ],
  },
  {
    questionId: "skin_spreading",
    category: "skin",
    questionText: "Is it spreading or getting larger?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "skin" }] },
    followUpQuestions: ["skin_fever"],
  },
  {
    questionId: "skin_face_throat_swelling",
    category: "skin",
    questionText: "Any swelling of the lips, face, or throat, or difficulty breathing?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "skin" }] },
  },
  {
    questionId: "skin_fever",
    category: "skin",
    questionText: "Do you have a fever along with this skin problem?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "skin_spreading", equals: true }] },
  },

  // ---------------------------------------------------------------------
  // Neurological
  // ---------------------------------------------------------------------
  {
    questionId: "neuro_symptoms",
    category: "neurological",
    questionText: "Which of these are you experiencing?",
    answerType: "multi_select",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "neurological" }] },
    options: [
      { value: "headache", label: "Headache" },
      { value: "dizziness", label: "Dizziness" },
      { value: "weakness_one_side", label: "Weakness or numbness on one side" },
      { value: "vision_changes", label: "Vision changes" },
      { value: "confusion", label: "Confusion" },
      { value: "speech_difficulty", label: "Difficulty speaking" },
    ],
    followUpQuestions: ["neuro_sudden_onset"],
  },
  {
    questionId: "neuro_sudden_onset",
    category: "neurological",
    questionText: "Did this come on suddenly, within minutes?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "neurological" }] },
  },

  // ---------------------------------------------------------------------
  // Mental wellbeing
  // ---------------------------------------------------------------------
  {
    questionId: "mh_main_difficulty",
    category: "mental_wellbeing",
    questionText: "What's been the main difficulty?",
    answerType: "multi_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "mental_wellbeing" }] },
    options: [
      { value: "low_mood", label: "Low mood" },
      { value: "anxiety", label: "Anxiety" },
      { value: "sleep", label: "Sleep problems" },
      { value: "stress", label: "Stress" },
      { value: "other", label: "Other" },
    ],
  },
  {
    questionId: "mh_safety",
    category: "mental_wellbeing",
    questionText: "Have you had any thoughts of harming yourself?",
    helperText: "This helps us make sure you're offered the right level of support. You can also call Lifeline on 13 11 14 at any time.",
    answerType: "single_select",
    redFlag: true,
    required: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "mental_wellbeing" }] },
    options: [
      { value: "no", label: "No" },
      { value: "sometimes", label: "Sometimes, but no plan" },
      { value: "frequently_or_plan", label: "Frequently, or I have a plan" },
    ],
  },
  {
    questionId: "mh_support",
    category: "mental_wellbeing",
    questionText: "Do you have someone you can talk to right now if you needed to?",
    answerType: "boolean",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "mental_wellbeing" }] },
  },

  // ---------------------------------------------------------------------
  // Fever / infection
  // ---------------------------------------------------------------------
  {
    questionId: "fev_temperature",
    category: "fever_infection",
    questionText: "What's your temperature, if you've measured it?",
    answerType: "single_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "fever_infection" }] },
    options: [
      { value: "not_measured", label: "Haven't measured it" },
      { value: "under_38", label: "Under 38°C" },
      { value: "38_39", label: "38–39°C" },
      { value: "over_39", label: "Over 39°C" },
    ],
    followUpQuestions: ["fev_stiff_neck_rash"],
  },
  {
    questionId: "fev_duration_high",
    category: "fever_infection",
    questionText: "Has the fever lasted more than 3 days?",
    answerType: "boolean",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "fever_infection" }] },
  },
  {
    questionId: "fev_stiff_neck_rash",
    category: "fever_infection",
    questionText: "Any stiff neck, rash that doesn't fade under pressure, or confusion?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "fev_temperature", equals: "over_39" }] },
  },

  // ---------------------------------------------------------------------
  // Injury
  // ---------------------------------------------------------------------
  {
    questionId: "inj_mechanism",
    category: "injury",
    questionText: "How did the injury happen?",
    answerType: "single_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "injury" }] },
    options: [
      { value: "fall", label: "Fall" },
      { value: "road_accident", label: "Road accident" },
      { value: "sports", label: "Sports" },
      { value: "cut", label: "Cut or laceration" },
      { value: "burn", label: "Burn" },
      { value: "other", label: "Other" },
    ],
  },
  {
    questionId: "inj_bleeding",
    category: "injury",
    questionText: "Is there any bleeding, and is it under control?",
    answerType: "single_select",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "injury" }] },
    options: [
      { value: "none", label: "No bleeding" },
      { value: "minor_controlled", label: "Minor, and under control" },
      { value: "heavy_uncontrolled", label: "Heavy or won't stop" },
    ],
  },
  {
    questionId: "inj_loss_of_consciousness",
    category: "injury",
    questionText: "Did you lose consciousness at any point?",
    answerType: "boolean",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "injury" }] },
  },

  // ---------------------------------------------------------------------
  // Medication
  // ---------------------------------------------------------------------
  {
    questionId: "med_issue_type",
    category: "medication",
    questionText: "What's this about?",
    answerType: "single_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "medication" }] },
    options: [
      { value: "side_effect", label: "Possible side effect" },
      { value: "dose_question", label: "Question about dose or timing" },
      { value: "refill", label: "Repeat prescription / refill" },
      { value: "allergic_reaction", label: "Possible allergic reaction" },
    ],
    followUpQuestions: ["med_reaction_symptoms"],
  },
  {
    questionId: "med_reaction_symptoms",
    category: "medication",
    questionText: "Which of these are you noticing?",
    answerType: "multi_select",
    redFlag: true,
    triggerConditions: { operator: "OR", checks: [{ questionId: "med_issue_type", equals: "allergic_reaction" }] },
    options: [
      { value: "rash", label: "Rash or hives" },
      { value: "swelling", label: "Swelling of face/lips/throat" },
      { value: "breathing_difficulty", label: "Difficulty breathing" },
      { value: "none_severe", label: "None of these — mild only" },
    ],
  },

  // ---------------------------------------------------------------------
  // General consultation / other
  // ---------------------------------------------------------------------
  {
    questionId: "gen_reason",
    category: "general_consultation",
    questionText: "What's the main reason for this appointment?",
    answerType: "single_select",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "general_consultation" }] },
    options: [
      { value: "check_up", label: "General check-up" },
      { value: "referral", label: "Referral to a specialist" },
      { value: "results", label: "Discuss test results" },
      { value: "prescription", label: "Prescription" },
      { value: "other", label: "Other" },
    ],
  },
  {
    questionId: "other_notes",
    category: "other",
    questionText: "Is there anything else that would help us understand your situation?",
    answerType: "text",
    triggerConditions: { operator: "OR", checks: [{ questionId: "category", equals: "other" }] },
  },
];

export function getQuestionById(questionId: string): QuestionDefinition | undefined {
  return QUESTION_BANK.find((q) => q.questionId === questionId);
}
