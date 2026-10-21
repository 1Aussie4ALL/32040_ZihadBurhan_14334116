import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { verifyPassword } from "./password";

// Cookie-based session for the clinician/reception demo dashboard (section 22).
// The session token is an opaque, server-generated id looked up against a Session
// row on every request — nothing meaningful is encoded client-side.

const SESSION_COOKIE = "triage_clinician_session";
const SESSION_TTL_HOURS = 12;

/** Seeded demo account used by the Patient / Reception view switcher. */
export const DEMO_RECEPTION_EMAIL = "reception@meridianhealth.demo";

/**
 * One-click switching into the reception view skips the password, so it is only
 * allowed under `next dev`. A production build (`next build && next start`) always
 * requires a real login, whatever the switcher shows.
 */
export function isDemoQuickSwitchEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

export interface CurrentClinician {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function loginClinician(
  email: string,
  password: string,
): Promise<{ success: true; clinician: CurrentClinician } | { success: false; error: string }> {
  const clinician = await prisma.clinician.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!clinician) return { success: false, error: "Invalid email or password." };

  const valid = await verifyPassword(password, clinician.passwordHash);
  if (!valid) return { success: false, error: "Invalid email or password." };

  await startSession(clinician.id);
  return {
    success: true,
    clinician: { id: clinician.id, name: clinician.name, email: clinician.email, role: clinician.role },
  };
}

/** Signs in as the demo receptionist without a password. Returns false if not allowed or not seeded. */
export async function loginDemoReception(): Promise<boolean> {
  if (!isDemoQuickSwitchEnabled()) return false;
  const reception = await prisma.clinician.findUnique({ where: { email: DEMO_RECEPTION_EMAIL } });
  if (!reception) return false;
  await startSession(reception.id);
  return true;
}

async function startSession(clinicianId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
  const session = await prisma.session.create({ data: { clinicianId, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentClinician(): Promise<CurrentClinician | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await prisma.session.findUnique({ where: { id: sessionId }, include: { clinician: true } });
  if (!session || session.expiresAt < new Date()) return null;

  const { clinician } = session;
  return { id: clinician.id, name: clinician.name, email: clinician.email, role: clinician.role };
}

export async function requireClinician(): Promise<CurrentClinician> {
  const clinician = await getCurrentClinician();
  if (!clinician) redirect("/clinician/login");
  return clinician;
}

export async function logoutClinician(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await prisma.session.delete({ where: { id: sessionId } }).catch(() => undefined);
  }
  cookieStore.delete(SESSION_COOKIE);
}
