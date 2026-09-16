import type { IconName } from "@/components/Icon";

export type Department = {
  slug: string;
  name: string;
  summary: string;
  detail: string;
  icon: IconName;
};

export const DEPARTMENTS: Department[] = [
  {
    slug: "general-medicine",
    name: "General Medicine",
    summary: "Everyday health concerns, check-ups, and referrals.",
    detail:
      "Our general practitioners manage everything from colds and flu to long-term condition monitoring, health checks, and specialist referrals.",
    icon: "stethoscope",
  },
  {
    slug: "cardiology",
    name: "Cardiology",
    summary: "Heart health, from screening to ongoing management.",
    detail:
      "Comprehensive cardiac assessment including ECGs, blood pressure and cholesterol management, and coordinated care for chronic heart conditions.",
    icon: "heart",
  },
  {
    slug: "paediatrics",
    name: "Paediatrics",
    summary: "Dedicated care for infants, children, and teens.",
    detail:
      "Growth and development checks, vaccinations, and family-centred care from our paediatric-trained clinicians in a child-friendly space.",
    icon: "child",
  },
  {
    slug: "womens-health",
    name: "Women's Health",
    summary: "Reproductive, prenatal, and general women's health.",
    detail:
      "Confidential, respectful care covering routine screening, prenatal check-ups, and reproductive health guidance.",
    icon: "heart-pulse",
  },
  {
    slug: "mental-health",
    name: "Mental Health",
    summary: "Confidential support for anxiety, stress, and more.",
    detail:
      "A private, judgement-free space to talk through what's going on, with care plans and referrals to psychology and psychiatry as needed.",
    icon: "mind",
  },
  {
    slug: "physiotherapy",
    name: "Physiotherapy",
    summary: "Injury recovery, mobility, and pain management.",
    detail:
      "Hands-on assessment and rehabilitation programs for sports injuries, post-surgical recovery, and chronic pain.",
    icon: "activity",
  },
  {
    slug: "dermatology",
    name: "Dermatology",
    summary: "Skin, hair, and nail conditions.",
    detail:
      "Assessment and management of rashes, acne, skin checks, and other dermatological concerns for all ages.",
    icon: "skin",
  },
  {
    slug: "emergency-triage",
    name: "Urgent Care Triage",
    summary: "Fast, prioritised intake for time-sensitive concerns.",
    detail:
      "Our CarePrior-assisted intake flags time-sensitive symptoms for immediate staff review, day or night. For life-threatening emergencies, always call 000.",
    icon: "siren",
  },
];

export type Doctor = {
  slug: string;
  name: string;
  role: string;
  department: string;
  bio: string;
  initials: string;
};

export const DOCTORS: Doctor[] = [
  {
    slug: "amelia-tran",
    name: "Dr. Amelia Tran",
    role: "General Practitioner",
    department: "General Medicine",
    bio: "Dr. Tran has 12 years' experience in primary care, with a special interest in preventative health and chronic disease management.",
    initials: "AT",
  },
  {
    slug: "michael-osei",
    name: "Dr. Michael Osei",
    role: "Cardiologist",
    department: "Cardiology",
    bio: "Dr. Osei specialises in non-invasive cardiology, helping patients manage blood pressure, cholesterol, and heart rhythm concerns.",
    initials: "MO",
  },
  {
    slug: "priya-nair",
    name: "Dr. Priya Nair",
    role: "Paediatrician",
    department: "Paediatrics",
    bio: "Dr. Nair is passionate about family-centred paediatric care, from newborn checks through to adolescent health.",
    initials: "PN",
  },
  {
    slug: "sophie-laurent",
    name: "Dr. Sophie Laurent",
    role: "Women's Health Physician",
    department: "Women's Health",
    bio: "Dr. Laurent provides compassionate, confidential care across reproductive health, prenatal checks, and general wellbeing.",
    initials: "SL",
  },
  {
    slug: "daniel-kim",
    name: "Dr. Daniel Kim",
    role: "Psychiatrist",
    department: "Mental Health",
    bio: "Dr. Kim works with patients on anxiety, depression, and stress-related conditions, with a focus on collaborative care plans.",
    initials: "DK",
  },
  {
    slug: "hannah-wilson",
    name: "Hannah Wilson",
    role: "Senior Physiotherapist",
    department: "Physiotherapy",
    bio: "Hannah supports patients recovering from injury and surgery with tailored, evidence-based rehabilitation programs.",
    initials: "HW",
  },
];
