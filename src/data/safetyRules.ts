import type { SafetyRuleDefinition } from "@/types";

// Layer 1 — deterministic safety rules (section 7).
//
// This is a documented PROTOTYPE rule framework built from representative simulated
// scenarios, not a complete or clinically validated triage protocol. Every rule here
// checks only explicit, patient-confirmed structured answers from the adaptive
// questioning engine — never free text and never AI inference — so the safety floor
// stays fully deterministic and reproducible. See /docs/triage-framework.md.
//
// severity "emergency" rules always resolve the appointment to Emergency and can
// never be downgraded by the AI layer. severity "urgent" rules set an Urgent floor
// that the AI may raise (e.g. to Emergency) but never lower.

export const SAFETY_RULES: SafetyRuleDefinition[] = [
  {
    ruleId: "SR-001-SEVERE-BREATHING",
    description: "Severe breathing difficulty",
    severity: "emergency",
    result: "Emergency",
    trigger: { operator: "AND", checks: [{ questionId: "resp_breathing_difficulty", equals: "severe" }] },
    explanation: "Severe breathing difficulty was reported.",
    patientMessage:
      "Your answers describe severe difficulty breathing. This booking system cannot determine the cause. If you believe this is a medical emergency, call 000 or attend an emergency department now.",
    clinicianFlag: "EMERGENCY — severe breathing difficulty",
  },
  {
    ruleId: "SR-002-CARDIAC-WARNING-CLUSTER",
    description: "Chest discomfort radiating to arm/jaw/back with sweating or nausea",
    severity: "emergency",
    result: "Emergency",
    trigger: {
      operator: "AND",
      checks: [
        { questionId: "cv_radiates", equals: true },
        { questionId: "cv_sweating", equals: true },
      ],
    },
    explanation: "Chest discomfort radiating to the arm/jaw/back, combined with sweating or nausea.",
    patientMessage:
      "Your answers describe a combination of symptoms that can require immediate medical attention. This booking system cannot determine the cause. If you believe this is a medical emergency, call 000 or attend an emergency department now.",
    clinicianFlag: "EMERGENCY — possible cardiac warning cluster",
  },
  {
    ruleId: "SR-003-CHEST-BREATHING-FAINTING",
    description: "Chest discomfort with breathing difficulty and fainting",
    severity: "emergency",
    result: "Emergency",
    trigger: {
      operator: "AND",
      checks: [
        { questionId: "cv_breathing_difficulty", equals: true },
        { questionId: "cv_fainting", equals: true },
      ],
    },
    explanation: "Breathing difficulty combined with fainting or near-fainting alongside chest discomfort.",
    patientMessage:
      "Your answers describe symptoms that can require immediate medical attention. This booking system cannot determine the cause. If you believe this is a medical emergency, call 000 or attend an emergency department now.",
    clinicianFlag: "EMERGENCY — chest discomfort with breathing difficulty and fainting",
  },
  {
    ruleId: "SR-004-LOSS-OF-CONSCIOUSNESS",
    description: "Loss of consciousness following an injury",
    severity: "emergency",
    result: "Emergency",
    trigger: { operator: "AND", checks: [{ questionId: "inj_loss_of_consciousness", equals: true }] },
    explanation: "Loss of consciousness was reported following an injury.",
    patientMessage:
      "Your answers describe a loss of consciousness after an injury. This booking system cannot assess head or neck injuries. If you believe this is a medical emergency, call 000 or attend an emergency department now.",
    clinicianFlag: "EMERGENCY — loss of consciousness after injury",
  },
  {
    ruleId: "SR-005-STROKE-LIKE",
    description: "Sudden-onset weakness, numbness, or speech difficulty",
    severity: "emergency",
    result: "Emergency",
    trigger: {
      operator: "AND",
      checks: [
        { questionId: "neuro_symptoms", in: ["weakness_one_side", "speech_difficulty", "vision_changes"] },
        { questionId: "neuro_sudden_onset", equals: true },
      ],
    },
    explanation: "Sudden-onset weakness/numbness, speech difficulty, or vision change — a stroke-like presentation.",
    patientMessage:
      "Your answers describe symptoms that can be a sign of stroke, which is a time-critical emergency. This booking system cannot determine the cause. Call 000 or attend an emergency department immediately.",
    clinicianFlag: "EMERGENCY — stroke-like presentation, sudden onset",
  },
  {
    ruleId: "SR-006-UNCONTROLLED-BLEEDING",
    description: "Heavy, uncontrolled bleeding",
    severity: "emergency",
    result: "Emergency",
    trigger: { operator: "AND", checks: [{ questionId: "inj_bleeding", equals: "heavy_uncontrolled" }] },
    explanation: "Bleeding was reported as heavy and not controlled.",
    patientMessage:
      "Your answers describe bleeding that has not been controlled. This booking system cannot manage active bleeding. Apply firm pressure and call 000 or attend an emergency department now.",
    clinicianFlag: "EMERGENCY — uncontrolled bleeding",
  },
  {
    ruleId: "SR-007-ANAPHYLAXIS-SIGNS",
    description: "Facial/throat swelling or breathing difficulty suggestive of severe allergic reaction",
    severity: "emergency",
    result: "Emergency",
    trigger: {
      operator: "OR",
      checks: [
        { questionId: "skin_face_throat_swelling", equals: true },
        { questionId: "med_reaction_symptoms", in: ["breathing_difficulty", "swelling"] },
      ],
    },
    explanation: "Swelling of the face/lips/throat or breathing difficulty consistent with a severe allergic reaction.",
    patientMessage:
      "Your answers describe signs that can indicate a severe allergic reaction (anaphylaxis). This booking system cannot treat this. Use an adrenaline autoinjector if prescribed, and call 000 now.",
    clinicianFlag: "EMERGENCY — possible severe allergic reaction",
  },
  {
    ruleId: "SR-008-SELF-HARM-IMMINENT",
    description: "Frequent thoughts of self-harm or an existing plan",
    severity: "emergency",
    result: "Emergency",
    trigger: { operator: "AND", checks: [{ questionId: "mh_safety", equals: "frequently_or_plan" }] },
    explanation: "Frequent thoughts of self-harm, or an existing plan, were reported.",
    patientMessage:
      "Your safety matters. Your answers suggest you may be at immediate risk. Please call 000, attend an emergency department, or call Lifeline on 13 11 14 right now. You do not have to manage this alone.",
    clinicianFlag: "EMERGENCY — immediate self-harm risk disclosed",
  },
  {
    ruleId: "SR-009-SEVERE-ACUTE-DETERIORATION",
    description: "Very high severity and actively worsening",
    severity: "emergency",
    result: "Emergency",
    trigger: {
      operator: "AND",
      checks: [
        { questionId: "core_severity", gte: 9 },
        { questionId: "core_progression", equals: "worsening" },
      ],
    },
    explanation: "Severity was rated 9 or above out of 10, and symptoms are reported as actively worsening.",
    patientMessage:
      "Your answers describe severe and worsening symptoms. This booking system cannot determine the cause. If you believe this is a medical emergency, call 000 or attend an emergency department now.",
    clinicianFlag: "EMERGENCY — severe (9–10/10) and worsening",
  },
  {
    ruleId: "SR-010-MENINGITIS-LIKE",
    description: "High fever with stiff neck, non-blanching rash, or confusion",
    severity: "emergency",
    result: "Emergency",
    trigger: {
      operator: "AND",
      checks: [
        { questionId: "fev_temperature", equals: "over_39" },
        { questionId: "fev_stiff_neck_rash", equals: true },
      ],
    },
    explanation: "A fever over 39°C combined with a stiff neck, non-blanching rash, or confusion.",
    patientMessage:
      "Your answers describe a combination of fever and other symptoms that can require urgent assessment. This booking system cannot determine the cause. If you believe this is a medical emergency, call 000 or attend an emergency department now.",
    clinicianFlag: "EMERGENCY — high fever with meningitis-pattern signs",
  },
  {
    ruleId: "SR-011-ABDOMINAL-BLEEDING",
    description: "Blood in vomit/stool or unusual bleeding with abdominal pain",
    severity: "urgent",
    result: "Urgent",
    trigger: { operator: "AND", checks: [{ questionId: "abd_bleeding", equals: true }] },
    explanation: "Blood in vomit or stool, or other unusual bleeding, was reported alongside abdominal pain.",
    patientMessage:
      "Your answers describe symptoms that should be assessed promptly and should not wait for a routine appointment. If symptoms suddenly worsen, call 000 or attend an emergency department.",
    clinicianFlag: "URGENT — possible GI bleeding",
  },
  {
    ruleId: "SR-012-NEUROVASCULAR-COMPROMISE",
    description: "Numbness or loss of movement below a musculoskeletal injury",
    severity: "urgent",
    result: "Urgent",
    trigger: { operator: "AND", checks: [{ questionId: "msk_numbness", equals: true }] },
    explanation: "Numbness, tingling, or loss of movement was reported below the site of injury.",
    patientMessage:
      "Your answers describe symptoms that should be assessed promptly and should not wait for a routine appointment. If the limb becomes pale, cold, or you lose all movement, call 000.",
    clinicianFlag: "URGENT — possible neurovascular compromise",
  },
  {
    ruleId: "SR-013-SELF-HARM-SOMETIMES",
    description: "Occasional thoughts of self-harm without a plan",
    severity: "urgent",
    result: "Urgent",
    trigger: { operator: "AND", checks: [{ questionId: "mh_safety", equals: "sometimes" }] },
    explanation: "Occasional thoughts of self-harm were reported, without a specific plan.",
    patientMessage:
      "Thank you for sharing that. Your answers suggest talking to someone promptly would help. If this changes and you feel at immediate risk, call 000 or Lifeline on 13 11 14 straight away.",
    clinicianFlag: "URGENT — self-harm ideation disclosed, no immediate plan",
  },
  {
    ruleId: "SR-014-PERSISTENT-VOMITING-FEVER",
    description: "Persistent vomiting with fever",
    severity: "urgent",
    result: "Urgent",
    trigger: {
      operator: "AND",
      checks: [
        { questionId: "abd_vomiting", equals: "persistent" },
        { questionId: "abd_fever", equals: true },
      ],
    },
    explanation: "Persistent vomiting (unable to keep fluids down) combined with fever.",
    patientMessage:
      "Your answers describe symptoms that should be assessed promptly, particularly because of the risk of dehydration. This should not wait for a routine appointment.",
    clinicianFlag: "URGENT — persistent vomiting with fever, dehydration risk",
  },
  {
    ruleId: "SR-016-VISIBLE-DEFORMITY-OR-OPEN-WOUND",
    description: "Visible deformity or open wound near an injury",
    severity: "urgent",
    result: "Urgent",
    trigger: { operator: "AND", checks: [{ questionId: "msk_deformity", equals: true }] },
    explanation: "A visible deformity or open wound was reported near the site of injury.",
    patientMessage:
      "Your answers describe an injury with visible deformity or an open wound, which should be assessed promptly and should not wait for a routine appointment. If you lose feeling, movement, or the area becomes pale or cold, call 000.",
    clinicianFlag: "URGENT — visible deformity or open wound",
  },
  {
    ruleId: "SR-015-HIGH-FEVER-PROLONGED",
    description: "Fever over 39°C for more than 3 days",
    severity: "urgent",
    result: "Urgent",
    trigger: {
      operator: "AND",
      checks: [
        { questionId: "fev_temperature", equals: "over_39" },
        { questionId: "fev_duration_high", equals: true },
      ],
    },
    explanation: "A fever over 39°C that has persisted for more than 3 days.",
    patientMessage:
      "Your answers describe a prolonged high fever that should be assessed promptly rather than waiting for a routine appointment.",
    clinicianFlag: "URGENT — prolonged high fever",
  },
  {
    ruleId: "SR-017-SPREADING-RASH-WITH-FEVER",
    description: "Spreading rash or swelling with fever",
    severity: "urgent",
    result: "Urgent",
    trigger: {
      operator: "AND",
      checks: [
        { questionId: "skin_spreading", equals: true },
        { questionId: "skin_fever", equals: true },
      ],
    },
    explanation: "A spreading skin rash or swelling combined with fever.",
    patientMessage:
      "Your answers describe a spreading skin problem with fever, which should be assessed promptly and should not wait for a routine appointment.",
    clinicianFlag: "URGENT — spreading rash/swelling with fever",
  },
  {
    ruleId: "SR-018-COUGHING-BLOOD",
    description: "Coughing up blood",
    severity: "urgent",
    result: "Urgent",
    trigger: { operator: "AND", checks: [{ questionId: "resp_cough_type", equals: "blood" }] },
    explanation: "Coughing up blood was reported.",
    patientMessage:
      "Your answers describe coughing up blood, which should be assessed promptly and should not wait for a routine appointment. If this becomes heavy or you develop severe breathing difficulty, call 000.",
    clinicianFlag: "URGENT — haemoptysis (coughing blood)",
  },
  {
    ruleId: "SR-019-CYANOSIS",
    description: "Blue or grey discolouration of lips, face, or fingertips",
    severity: "emergency",
    result: "Emergency",
    trigger: { operator: "AND", checks: [{ questionId: "resp_lips_face_blue", equals: true }] },
    explanation: "Blue or grey discolouration of the lips, face, or fingertips was reported, alongside breathing difficulty.",
    patientMessage:
      "Your answers describe a sign that can indicate a serious lack of oxygen. This booking system cannot treat this. Call 000 or attend an emergency department now.",
    clinicianFlag: "EMERGENCY — possible cyanosis",
  },
];
