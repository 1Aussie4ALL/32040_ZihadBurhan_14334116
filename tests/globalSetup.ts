import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

// Creates a disposable SQLite database for the integration tests (tests/booking.integration.test.ts)
// so they exercise the real Prisma code path — transactions, unique constraints,
// cascade deletes — without ever touching the demo `prisma/dev.db`.
//
// `prisma db push` builds the schema directly from schema.prisma, which keeps this
// independent of migration history. Doctors, slots and a clinician are seeded here
// rather than by prisma/seed.ts, because that script targets DATABASE_URL from .env
// and clears it — pointing it at a test database would be easy to get wrong.

const ROOT = path.resolve(__dirname, "..");
const TEST_DB_PATH = path.join(ROOT, "prisma", "test.db");
export const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

/** Best-effort delete. On Windows the SQLite handle can outlive the test workers
 * briefly, so a failure here is not fatal — `db push --force-reset` in setup()
 * guarantees a clean schema on the next run regardless. */
function removeTestDb() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (!existsSync(file)) continue;
    try {
      rmSync(file, { force: true });
    } catch {
      // held open by a lingering connection — setup() resets it instead
    }
  }
}

export async function setup() {
  removeTestDb();

  execFileSync("npx", ["prisma", "db", "push", "--skip-generate", "--force-reset", "--accept-data-loss"], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
    shell: process.platform === "win32",
  });

  const { PrismaClient } = await import("@prisma/client");
  const { DOCTORS } = await import("../src/data/doctors");

  const prisma = new PrismaClient({ datasources: { db: { url: TEST_DATABASE_URL } } });

  try {
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

    // A small block of future slots per doctor. Deliberately spread across the next
    // few days so timing-guidance assertions have both a near and a distant slot.
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    for (const doctor of DOCTORS) {
      await prisma.appointmentSlot.createMany({
        data: [2, 6, 30, 100, 24 * 7].map((hoursAhead) => ({
          doctorId: doctor.id,
          startTime: new Date(now + hoursAhead * HOUR),
          durationMinutes: 15,
        })),
      });
    }

    await prisma.clinician.create({
      data: {
        // Hash of "TriageDemo!23" is irrelevant here — these tests call the data
        // layer directly and never go through the login form.
        name: "Integration Test Clinician",
        email: "integration@meridianhealth.demo",
        passwordHash: "not-a-real-hash",
        role: "clinician",
      },
    });
  } finally {
    await prisma.$disconnect();
  }
}

export async function teardown() {
  removeTestDb();
}
