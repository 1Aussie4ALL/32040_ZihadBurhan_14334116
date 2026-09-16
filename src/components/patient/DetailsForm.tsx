"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import type { PatientDetailsInput } from "@/types";

const SEX_OPTIONS = [
  { value: "", label: "Prefer not to say / skip" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "intersex", label: "Intersex" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

function fieldClass(hasError: boolean) {
  return `mt-1 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand ${
    hasError ? "border-red-400" : "border-slate-300"
  }`;
}

export function DetailsForm({
  value,
  onNext,
}: {
  value: PatientDetailsInput;
  onNext: (details: PatientDetailsInput) => void;
}) {
  const [form, setForm] = useState<PatientDetailsInput>(value);
  const [errors, setErrors] = useState<Partial<Record<keyof PatientDetailsInput, string>>>({});

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.firstName.trim()) next.firstName = "First name is required.";
    if (!form.lastName.trim()) next.lastName = "Last name is required.";
    if (!form.dateOfBirth) next.dateOfBirth = "Date of birth is required.";
    else if (new Date(form.dateOfBirth) > new Date()) next.dateOfBirth = "Date of birth cannot be in the future.";
    if (!form.phone.trim() || form.phone.trim().length < 6) next.phone = "Enter a valid phone number.";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (validate()) onNext(form);
      }}
      noValidate
    >
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Your details</h2>
        <p className="mt-1 text-sm text-muted">
          Use demo details for this prototype — nothing here is stored beyond this demo database.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" id="firstName" error={errors.firstName}>
          <input
            id="firstName"
            className={fieldClass(Boolean(errors.firstName))}
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" id="lastName" error={errors.lastName}>
          <input
            id="lastName"
            className={fieldClass(Boolean(errors.lastName))}
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            autoComplete="family-name"
          />
        </Field>
        <Field label="Date of birth" id="dateOfBirth" error={errors.dateOfBirth}>
          <input
            id="dateOfBirth"
            type="date"
            className={fieldClass(Boolean(errors.dateOfBirth))}
            value={form.dateOfBirth}
            onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            autoComplete="bday"
          />
        </Field>
        <Field label="Sex (optional)" id="sex">
          <select
            id="sex"
            className={fieldClass(false)}
            value={form.sex ?? ""}
            onChange={(e) =>
              setForm({ ...form, sex: (e.target.value || undefined) as PatientDetailsInput["sex"] })
            }
          >
            {SEX_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Phone" id="phone" error={errors.phone}>
          <input
            id="phone"
            type="tel"
            className={fieldClass(Boolean(errors.phone))}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            autoComplete="tel"
          />
        </Field>
        <Field label="Email" id="email" error={errors.email}>
          <input
            id="email"
            type="email"
            className={fieldClass(Boolean(errors.email))}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            autoComplete="email"
          />
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit">Continue</Button>
      </div>
    </form>
  );
}

function Field({
  label,
  id,
  error,
  children,
}: {
  label: string;
  id: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
