"use client";

import { useEffect } from "react";
import { RotateCcw, ShieldAlert } from "lucide-react";
import { Container, Card } from "@/components/common/Card";
import { Button, LinkButton } from "@/components/common/Button";

// Staff-facing error boundary.
//
// The clinical risk on this side is a clinician assuming an empty or broken queue
// means "no requests waiting". This never silently renders an empty state: it says
// plainly that the list could not be loaded and that pending requests may exist.

export default function ClinicianError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Clinician route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <Container className="py-12">
      <Card className="mx-auto max-w-2xl p-8">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 shrink-0 text-red-600" size={28} aria-hidden="true" />
          <div>
            <h1 className="text-xl font-semibold text-slate-900">This page could not be loaded</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              An error stopped this view from loading. <strong className="text-slate-800">Do not read this
              as an empty queue</strong> — appointment requests may be waiting for review that are not shown
              here. Retry, and if the problem persists, check pending requests by another means before
              assuming there are none.
            </p>
          </div>
        </div>

        {error.digest && (
          <p className="mt-4 font-mono text-xs text-muted">
            Reference: {error.digest} (matches the server log entry)
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => retry()}>
            <RotateCcw size={16} aria-hidden="true" /> Try again
          </Button>
          <LinkButton href="/clinician/dashboard" variant="outline">
            Back to queue
          </LinkButton>
        </div>
      </Card>
    </Container>
  );
}
