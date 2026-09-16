import type { DoctorSeed } from "@/types";

// Fictional clinicians for "Meridian Health Clinic" (synthetic demo data only —
// see section 26). Recommendation logic in src/lib/triage/doctorMatch.ts uses
// `suitableFor` to pick 2–3 relevant cards after triage; the patient can always
// browse the full list via "See all doctors" (section 11).

export const DOCTORS: DoctorSeed[] = [
  {
    id: "dr-aisha-rahman",
    name: "Dr. Aisha Rahman",
    specialty: "General Practitioner",
    qualifications: "MBBS, FRACGP",
    areasOfInterest: ["General health", "Chronic disease management", "Infections", "Preventive care"],
    clinicLocation: "Meridian Health Clinic — Room 3, Level 2, 128 Grafton St, Bondi Junction NSW 2022",
    bio: "Dr. Rahman has 12 years' experience in general practice, with a focus on everyday illness, chronic condition management, and preventive health checks.",
    avatarInitials: "AR",
    avatarColor: "bg-teal-600",
    suitableFor: ["general_consultation", "fever_infection", "medication", "respiratory", "other"],
  },
  {
    id: "dr-liam-oconnor",
    name: "Dr. Liam O'Connor",
    specialty: "General Practitioner",
    qualifications: "MBBS, FRACGP, Dip. Cardiology",
    areasOfInterest: ["Cardiovascular health", "Abdominal & digestive concerns", "Neurological symptoms", "Skin checks"],
    clinicLocation: "Meridian Health Clinic — Room 4, Level 2, 128 Grafton St, Bondi Junction NSW 2022",
    bio: "Dr. O'Connor has a special interest in cardiovascular and digestive health, and regularly manages patients presenting with chest, abdominal, and neurological symptoms.",
    avatarInitials: "LO",
    avatarColor: "bg-indigo-600",
    suitableFor: ["cardiovascular", "abdominal", "neurological", "skin", "general_consultation"],
  },
  {
    id: "dr-priya-nair",
    name: "Dr. Priya Nair",
    specialty: "Women's Health GP",
    qualifications: "MBBS, FRACGP, Dip. Women's Health",
    areasOfInterest: ["Women's health", "Reproductive health", "Skin & general concerns"],
    clinicLocation: "Meridian Health Clinic — Room 5, Level 2, 128 Grafton St, Bondi Junction NSW 2022",
    bio: "Dr. Nair focuses on women's health across all life stages, alongside general consultations, skin concerns, and abdominal complaints.",
    avatarInitials: "PN",
    avatarColor: "bg-rose-600",
    suitableFor: ["abdominal", "skin", "general_consultation", "other"],
  },
  {
    id: "dr-marcus-chen",
    name: "Dr. Marcus Chen",
    specialty: "Mental Health GP",
    qualifications: "MBBS, FRACGP, Focused Psychological Strategies",
    areasOfInterest: ["Anxiety & mood", "Sleep", "Stress management", "Mental health care plans"],
    clinicLocation: "Meridian Health Clinic — Room 6, Level 2, 128 Grafton St, Bondi Junction NSW 2022",
    bio: "Dr. Chen has additional training in mental health care and takes a calm, unhurried approach to conversations about mood, anxiety, and stress.",
    avatarInitials: "MC",
    avatarColor: "bg-violet-600",
    suitableFor: ["mental_wellbeing"],
  },
  {
    id: "dr-sarah-whitfield",
    name: "Dr. Sarah Whitfield",
    specialty: "Sports & Minor Injury GP",
    qualifications: "MBBS, FRACGP, Dip. Sports Medicine",
    areasOfInterest: ["Sports injuries", "Musculoskeletal pain", "Minor trauma", "Rehabilitation"],
    clinicLocation: "Meridian Health Clinic — Room 7, Level 2, 128 Grafton St, Bondi Junction NSW 2022",
    bio: "Dr. Whitfield has a background in sports medicine and sees a high volume of joint, muscle, and minor injury presentations.",
    avatarInitials: "SW",
    avatarColor: "bg-amber-600",
    suitableFor: ["musculoskeletal", "injury"],
  },
  {
    id: "dr-ben-okafor",
    name: "Dr. Ben Okafor",
    specialty: "Paediatric-focused GP",
    qualifications: "MBBS, FRACGP, Dip. Child Health",
    areasOfInterest: ["Child & adolescent health", "Fevers & infections", "Skin conditions", "Family medicine"],
    clinicLocation: "Meridian Health Clinic — Room 8, Level 2, 128 Grafton St, Bondi Junction NSW 2022",
    bio: "Dr. Okafor has additional paediatric training and is a popular choice for families, fevers, infections, and childhood skin concerns.",
    avatarInitials: "BO",
    avatarColor: "bg-sky-600",
    suitableFor: ["fever_infection", "skin", "respiratory", "general_consultation"],
  },
];

export function getDoctorById(id: string): DoctorSeed | undefined {
  return DOCTORS.find((d) => d.id === id);
}
