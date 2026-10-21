"use client";

import { useState } from "react";
import { Button } from "./Button";
import { ValidationDialog, useValidationPrompt } from "./ValidationPrompt";
import { getEmailError } from "@/lib/validation/email";

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const prompt = useValidationPrompt();

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
        const data = new FormData(e.currentTarget);
        const value = (key: string) => String(data.get(key) ?? "").trim();
        const emailError = getEmailError(value("email"));
        const ok = prompt.report([
          ...(value("name") ? [] : [{ fieldId: "contact-name", message: "Name is required." }]),
          ...(emailError ? [{ fieldId: "contact-email", message: emailError }] : []),
          ...(value("message") ? [] : [{ fieldId: "contact-message", message: "Message is required." }]),
        ]);
        if (ok) setSubmitted(true);
      }}
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="text-sm font-medium text-slate-700">
            Name
          </label>
          <input
            id="contact-name"
            name="name"
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
            name="email"
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
          name="message"
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

      <ValidationDialog {...prompt} />
    </form>
  );
}
