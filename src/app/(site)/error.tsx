"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Container, Card } from "@/components/common/Card";
import { Button, LinkButton } from "@/components/common/Button";

// Patient-facing error boundary (section 29 — graceful degradation).
//
// A failure here must never look like a clinical result, and must never leave a
// patient believing their request was assessed or submitted when it was not. It
// repeats the emergency advice, because an unwell patient hitting an error page is
// exactly the moment the safety message matters most.

export default function SiteError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    // Server Component errors arrive with only a digest; the detail stays in the
    // server logs deliberately, so nothing sensitive is exposed to the browser.
    console.error("Patient-facing route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <Container className="py-16">
      <Card className="mx-auto max-w-2xl p-8">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 shrink-0 text-amber-600" size={28} aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Something went wrong on our side</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              We couldn&apos;t complete that step. Nothing you entered has been assessed or submitted, so
              please try again — and if it keeps happening, call the clinic on (02) 5550 1234 and our staff
              can book you in directly.
            </p>
          </div>
        </div>

        <div
          role="alert"
          className="mt-6 rounded-lg border-2 border-red-600 bg-red-50 p-4 text-sm font-semibold text-red-900"
        >
          If this is a medical emergency, do not wait for this website. Call 000 or attend your nearest
          emergency department now.
        </div>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-muted">Reference: {error.digest}</p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => retry()}>
            <RotateCcw size={16} aria-hidden="true" /> Try again
          </Button>
          <LinkButton href="/" variant="outline">
            Return to home
          </LinkButton>
        </div>
      </Card>
    </Container>
  );
}
