import type { Metadata } from "next";
import { Container, Card } from "@/components/common/Card";
import { Disclaimer } from "@/components/common/Disclaimer";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold text-slate-900">About Meridian Health Clinic</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 lg:col-span-2">
          <p>
            Meridian Health Clinic is a fictional private general practice created for an academic prototype:
            an <strong>AI-Assisted Healthcare Appointment Request Triage System</strong>. The clinic and every
            clinician, patient, and appointment shown on this site are synthetic demo content — nothing here
            represents a real practice.
          </p>
          <p>
            The prototype explores whether collecting more structured information before an appointment —
            through adaptive questioning, a deterministic safety layer, and an AI-assisted assessment — can
            help patients get a clearer sense of urgency and help clinicians walk into a consultation better
            prepared, without ever attempting to diagnose or replace professional judgement.
          </p>
          <p>
            Two safeguards sit at the centre of the design. First, a set of deterministic, always-on safety
            rules runs before anything AI-related, and can never be downgraded by the AI layer — if a rule
            fires, the request is flagged as Emergency or Urgent regardless of what the AI suggests. Second,
            every single request, no matter its urgency, requires human clinician review before any decision
            is treated as final.
          </p>
        </div>
        <Card className="h-fit p-5">
          <Disclaimer />
        </Card>
      </div>
    </Container>
  );
}
