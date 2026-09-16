import type { Metadata } from "next";
import { FileQuestion } from "lucide-react";
import { Container, Card } from "@/components/common/Card";
import { LinkButton } from "@/components/common/Button";

// Root 404. Also serves every unmatched URL for the whole app, and the notFound()
// calls in the confirmation and clinician request-detail pages — so it is reachable
// by a patient following a stale or mistyped booking-reference link, which is why it
// carries the emergency advice rather than a bare "page not found".

export const metadata: Metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-2xl p-8">
        <div className="flex items-start gap-3">
          <FileQuestion className="mt-0.5 shrink-0 text-brand" size={28} aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">We couldn&apos;t find that page</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              The page or appointment reference you followed doesn&apos;t exist, or is no longer available.
              If you were checking an appointment request, the reference link may have been mistyped — call
              the clinic on (02) 5550 1234 and our staff can look it up for you.
            </p>
          </div>
        </div>

        <div
          role="alert"
          className="mt-6 rounded-lg border-2 border-red-600 bg-red-50 p-4 text-sm font-semibold text-red-900"
        >
          If this is a medical emergency, call 000 or attend your nearest emergency department now.
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <LinkButton href="/">Return to home</LinkButton>
          <LinkButton href="/book" variant="outline">
            Book an appointment
          </LinkButton>
        </div>
      </Card>
    </Container>
  );
}
