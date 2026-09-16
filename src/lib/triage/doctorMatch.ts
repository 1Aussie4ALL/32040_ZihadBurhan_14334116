import { DOCTORS } from "@/data/doctors";
import type { ComplaintCategory, DoctorSeed } from "@/types";

// Clinician recommendation (section 11): after triage, surface 2–3 relevant doctors.
// The patient can always browse everyone via "See all doctors" — this never limits
// what the patient can book, only what's suggested first.

export function recommendDoctors(
  category: ComplaintCategory,
  ageYears: number | null,
  limit = 3,
): DoctorSeed[] {
  const scored = DOCTORS.map((doctor) => {
    let score = 0;
    if (doctor.suitableFor.includes(category)) score += 3;
    if (doctor.specialty === "General Practitioner") score += 1;
    if (ageYears !== null && ageYears < 16 && doctor.specialty === "Paediatric-focused GP") score += 4;
    return { doctor, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const ranked = scored.filter((s) => s.score > 0).map((s) => s.doctor);
  const result: DoctorSeed[] = [...ranked];

  for (const doctor of DOCTORS) {
    if (result.length >= limit) break;
    if (!result.find((d) => d.id === doctor.id)) result.push(doctor);
  }

  return result.slice(0, limit);
}

export function calculateAgeYears(dateOfBirth: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = now.getMonth() - dateOfBirth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dateOfBirth.getDate())) {
    age -= 1;
  }
  return age;
}
