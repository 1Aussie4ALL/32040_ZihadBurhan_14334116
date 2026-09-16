import { redirect } from "next/navigation";
import { getCurrentClinician } from "@/lib/auth/session";

export default async function ClinicianIndexPage() {
  const clinician = await getCurrentClinician();
  redirect(clinician ? "/clinician/dashboard" : "/clinician/login");
}
