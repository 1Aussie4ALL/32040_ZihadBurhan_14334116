"use client";

import { FormEvent, useState } from "react";
import Button from "./Button";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-card border border-primary/30 bg-primary-light p-6 text-center">
        <p className="font-semibold text-primary">Thanks — we&apos;ve received your message.</p>
        <p className="mt-1 text-sm text-text-secondary">
          This is a demo form; no message was actually sent. For a real appointment request, please use the patient
          portal.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-text-primary">Full name</span>
          <input
            required
            type="text"
            className="focus-ring mt-1 w-full rounded-input border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
            placeholder="Jane Smith"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-text-primary">Email</span>
          <input
            required
            type="email"
            className="focus-ring mt-1 w-full rounded-input border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
            placeholder="jane@example.com"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-text-primary">Phone (optional)</span>
        <input
          type="tel"
          className="focus-ring mt-1 w-full rounded-input border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          placeholder="04xx xxx xxx"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-text-primary">Message</span>
        <textarea
          required
          rows={4}
          className="focus-ring mt-1 w-full rounded-input border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary"
          placeholder="How can we help?"
        />
      </label>
      <p className="text-xs text-text-muted">
        This form is for general enquiries only — it is not monitored for urgent or clinical requests. For an
        appointment, please use the patient portal. In an emergency, call 000.
      </p>
      <Button type="submit">Send Message</Button>
    </form>
  );
}
