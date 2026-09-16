"use client";

import { useState } from "react";
import { Button } from "./Button";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        Thanks — your message has been noted. (This is a demo form; for a real appointment request, please use{" "}
        <a href="/book" className="font-semibold underline">
          Book an Appointment
        </a>
        .)
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="contact-name"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
          />
        </div>
        <div>
          <label htmlFor="contact-email" className="text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="contact-email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
          />
        </div>
      </div>
      <div>
        <label htmlFor="contact-message" className="text-sm font-medium text-slate-700">
          Message
        </label>
        <textarea
          id="contact-message"
          required
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
        />
      </div>
      <p className="text-xs text-muted">
        This is a demo contact form for general (non-clinical) enquiries only — please don&apos;t enter real
        personal or medical information. For an appointment request, use Book an Appointment instead.
      </p>
      <Button type="submit">Send message</Button>
    </form>
  );
}
