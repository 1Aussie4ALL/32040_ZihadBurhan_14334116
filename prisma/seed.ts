import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DOCTORS } from "../src/data/doctors";

// Seeds the database with demo doctors, appointment availability, and clinician
// login accounts (section 26). Safe to re-run — it clears prior data first.

const prisma = new PrismaClient();

const DAILY_TIMES = [
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
];

const DAYS_OF_AVAILABILITY = 10;
const MIN_LEAD_TIME_MS = 30 * 60 * 1000;

async function main() {
  console.log("Clearing existing data...");
  await prisma.evaluationResult.deleteMany();
  await prisma.evaluationRun.deleteMany();
  await prisma.systemAuditLog.deleteMany();
  await prisma.clinicianReview.deleteMany();
  await prisma.safetyRuleResult.deleteMany();
  await prisma.triageAssessment.deleteMany();
  await prisma.patientAnswer.deleteMany();
  await prisma.appointmentRequest.deleteMany();
  await prisma.appointmentSlot.deleteMany();
  await prisma.session.deleteMany();
  await prisma.clinician.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.patient.deleteMany();

  console.log("Seeding doctors...");
  for (const doctor of DOCTORS) {
    await prisma.doctor.create({
      data: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        qualifications: doctor.qualifications,
        areasOfInterest: JSON.stringify(doctor.areasOfInterest),
        clinicLocation: doctor.clinicLocation,
        bio: doctor.bio,
        avatarInitials: doctor.avatarInitials,
        avatarColor: doctor.avatarColor,
      },
    });
  }

  console.log("Seeding appointment availability...");
  const now = new Date();
  for (const doctor of DOCTORS) {
    const slots: { doctorId: string; startTime: Date; durationMinutes: number }[] = [];

    for (let dayOffset = 0; dayOffset < DAYS_OF_AVAILABILITY; dayOffset++) {
      const day = new Date(now);
      day.setDate(day.getDate() + dayOffset);

      for (const time of DAILY_TIMES) {
        const [hour, minute] = time.split(":").map(Number);
        const startTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
        if (startTime.getTime() - now.getTime() < MIN_LEAD_TIME_MS) continue;
        slots.push({ doctorId: doctor.id, startTime, durationMinutes: 15 });
      }
    }

    const hasSameDaySlot = slots.some((s) => s.startTime.toDateString() === now.toDateString());
    if (!hasSameDaySlot) {
      slots.unshift({
        doctorId: doctor.id,
        startTime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        durationMinutes: 15,
      });
    }

    await prisma.appointmentSlot.createMany({ data: slots });
  }

  console.log("Seeding clinician demo accounts...");
  const demoPasswordHash = await bcrypt.hash("TriageDemo!23", 10);
  await prisma.clinician.create({
    data: {
      name: "Nurse Demo Clinician",
      email: "clinician@meridianhealth.demo",
      passwordHash: demoPasswordHash,
      role: "clinician",
    },
  });
  await prisma.clinician.create({
    data: {
      name: "Reception Demo",
      email: "reception@meridianhealth.demo",
      passwordHash: demoPasswordHash,
      role: "reception",
    },
  });

  console.log("Seed complete.");
  console.log("Demo clinician login: clinician@meridianhealth.demo / TriageDemo!23");
  console.log("Demo reception login: reception@meridianhealth.demo / TriageDemo!23");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
