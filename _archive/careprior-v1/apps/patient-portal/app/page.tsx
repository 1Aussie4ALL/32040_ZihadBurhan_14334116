import Link from "next/link";
import Disclaimer from "@/components/Disclaimer";
import Button from "@/components/Button";

const STEPS = [
  { title: "Describe how you feel", detail: "Tell us what's going on, in your own words — no forms full of jargon." },
  { title: "Answer a few quick questions", detail: "We ask up to 9 short follow-up questions, only the ones relevant to you." },
  { title: "Get matched with a doctor", detail: "We suggest doctors whose specialty best fits what you've described." },
  { title: "Pick a time that suits you", detail: "Choose a suggested slot or browse all available appointment times." },
];

const FEATURES = [
  {
    title: "Human-led decisions",
    detail: "Every recommendation is reviewed and approved by a qualified staff member before anything happens.",
  },
  {
    title: "Deterministic safety rules",
    detail: "Fixed, auditable safety checks can flag your request for immediate attention — AI can never lower that flag.",
  },
  {
    title: "Explainable, always",
    detail: "Nothing is a black box: every step is recorded in an append-only audit trail clinic staff can review.",
  },
];

export default function LandingPage() {
  return (
    <main className="space-y-10">
      <header className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">CarePrior</p>
        <h1 className="font-display text-3xl font-bold text-text-primary">AI-assisted intake. Human-led decisions.</h1>
        <p className="max-w-2xl text-text-secondary">
          CarePrior helps clinic staff review appointment requests more consistently by asking clearer follow-up
          questions, matching you with the right doctor, and explaining what it noticed — every recommendation is
          reviewed by a person before anything happens.
        </p>
        <div className="flex gap-3 pt-2">
          <Link href="/login"><Button>Log in to continue</Button></Link>
        </div>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">How it works</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="rounded-card border border-border bg-bg-surface p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase text-text-muted">Step {i + 1}</p>
              <p className="mt-1 font-semibold text-text-primary">{step.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{step.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Why CarePrior</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-card border border-border bg-bg-surface p-4 shadow-sm">
              <p className="font-semibold text-text-primary">{feature.title}</p>
              <p className="mt-1 text-sm text-text-secondary">{feature.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-card border border-border bg-bg-surface p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-text-primary">What this prototype does</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-text-secondary">
          <li>Collects your symptom information and asks relevant follow-up questions</li>
          <li>Suggests doctors and appointment times suited to what you've described</li>
          <li>Highlights information that clinic staff should look at first</li>
          <li>Never diagnoses, prescribes, or replaces a healthcare professional</li>
          <li>Always requires a qualified staff member to review before any action is taken</li>
        </ul>
      </div>

      <Disclaimer />

      <footer className="text-xs text-text-muted">
        32040 Industry Project — University of Technology Sydney — synthetic data only.
      </footer>
    </main>
  );
}
