import type { Metadata } from "next";
import { getCurrentClinician } from "@/lib/auth/session";
import { AppShell } from "@/components/clinician/AppShell";

export const metadata: Metadata = { title: { default: "Clinician Portal", template: "%s — Clinician Portal" } };

export default async function ClinicianLayout({ children }: { children: React.ReactNode }) {
  const clinician = await getCurrentClinician();
  return <AppShell clinician={clinician}>{children}</AppShell>;
}
