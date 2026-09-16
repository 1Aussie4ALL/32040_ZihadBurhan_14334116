import type { ComplaintCategory } from "@/types";

export const CATEGORY_META: Record<ComplaintCategory, { label: string; description: string }> = {
  respiratory: { label: "Respiratory", description: "Coughs, colds, breathing difficulty, chest infections." },
  cardiovascular: {
    label: "Chest / Cardiovascular",
    description: "Chest pain, palpitations, heart-related concerns.",
  },
  abdominal: { label: "Abdominal", description: "Stomach pain, digestive issues, nausea." },
  musculoskeletal: { label: "Musculoskeletal", description: "Joint, muscle, and bone pain or injury." },
  skin: { label: "Skin", description: "Rashes, wounds, and other skin concerns." },
  neurological: { label: "Neurological", description: "Headaches, dizziness, numbness, or weakness." },
  mental_wellbeing: { label: "Mental Wellbeing", description: "Mood, anxiety, stress, and sleep concerns." },
  fever_infection: {
    label: "Fever / Infection",
    description: "Fevers, suspected infections, feeling generally unwell.",
  },
  injury: { label: "Injury", description: "Recent falls, cuts, burns, or accidents." },
  medication: { label: "Medication", description: "Prescriptions, refills, or medication questions." },
  general_consultation: { label: "General Consultation", description: "Check-ups, referrals, and general advice." },
  other: { label: "Other", description: "Anything not covered by the categories above." },
};

export const CATEGORY_LIST = Object.keys(CATEGORY_META) as ComplaintCategory[];
