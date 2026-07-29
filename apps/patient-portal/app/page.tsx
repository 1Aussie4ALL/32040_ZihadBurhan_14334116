import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import Button from "@/components/Button";

export default function LandingPage() {
  return (
    <main className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">CarePrior</p>
        <h1 className="font-display text-3xl font-bold text-text-primary">AI-assisted intake. Human-led decisions.</h1>
        <p className="text-text-secondary">
          CarePrior helps clinic staff review appointment requests more consistently by asking clearer follow-up
          questions and explaining what it noticed — every recommendation is reviewed by a person before anything
          happens.
        </p>
      </header>

      <div className="rounded-card border border-border bg-bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">What this prototype does</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-text-secondary">
          <li>Collects your symptom information and asks relevant follow-up questions</li>
          <li>Highlights information that clinic staff should look at first</li>
          <li>Never diagnoses, prescribes, or replaces a healthcare professional</li>
          <li>Always requires a qualified staff member to review before any action is taken</li>
        </ul>
      </div>

      <Disclaimer />

      <div className="flex gap-3">
        <Link href="/login"><Button>Log in to continue</Button></Link>
      </div>

      <footer className="text-xs text-text-muted">
        32040 Industry Project — University of Technology Sydney — synthetic data only.
      </footer>
    </main>
  );
}
