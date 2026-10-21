"use client";

import { useState } from "react";
import { Button } from "@/components/common/Button";
import { ValidationDialog, useValidationPrompt } from "@/components/common/ValidationPrompt";
import {
  getPatientDetailsErrors,
  PATIENT_FIELD_ORDER,
  type PatientDetailsErrors,
} from "@/lib/validation/patientDetails";
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
  initialErrors,
  notice,
  onNext,
}: {
  value: PatientDetailsInput;
  /** Errors to show on arrival, e.g. when the final submit sent the patient back here. */
  initialErrors?: PatientDetailsErrors;
  notice?: string;
  onNext: (details: PatientDetailsInput) => void;
}) {
  const [form, setForm] = useState<PatientDetailsInput>(value);
  const [errors, setErrors] = useState<PatientDetailsErrors>(initialErrors ?? {});
  const prompt = useValidationPrompt();

  function update<K extends keyof PatientDetailsInput>(key: K, val: PatientDetailsInput[K]) {
    setForm({ ...form, [key]: val });
    if (errors[key]) setErrors({ ...errors, [key]: undefined });
  }

  // Explain a field as soon as the patient leaves it, but only once they've typed
  // something: tabbing past an empty field shouldn't nag before they've submitted.
  function checkField(key: keyof PatientDetailsInput) {
    if (!String(form[key] ?? "").trim()) return;
    const message = getPatientDetailsErrors(form)[key];
    if (message) setErrors((prev) => ({ ...prev, [key]: message }));
  }

  function validate(): boolean {
    const next = getPatientDetailsErrors(form);
    setErrors(next);
    return prompt.report(
      PATIENT_FIELD_ORDER.filter((key) => next[key]).map((key) => ({ fieldId: key, message: next[key]! })),
    );
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

      {notice && (
        <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          {notice}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" id="firstName" error={errors.firstName}>
          <input
            id="firstName"
            className={fieldClass(Boolean(errors.firstName))}
            value={form.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            onBlur={() => checkField("firstName")}
            autoComplete="given-name"
          />
        </Field>
        <Field label="Last name" id="lastName" error={errors.lastName}>
          <input
            id="lastName"
            className={fieldClass(Boolean(errors.lastName))}
            value={form.lastName}
            onChange={(e) => update("lastName", e.target.value)}
            onBlur={() => checkField("lastName")}
            autoComplete="family-name"
          />
        </Field>
        <Field label="Date of birth" id="dateOfBirth" error={errors.dateOfBirth}>
          <input
            id="dateOfBirth"
            type="date"
            className={fieldClass(Boolean(errors.dateOfBirth))}
            value={form.dateOfBirth}
            onChange={(e) => update("dateOfBirth", e.target.value)}
            onBlur={() => checkField("dateOfBirth")}
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
        <Field label="Mobile number" id="phone" error={errors.phone}>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            placeholder="0412 345 678"
            className={fieldClass(Boolean(errors.phone))}
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            onBlur={() => checkField("phone")}
            autoComplete="tel"
          />
        </Field>
        <Field label="Email" id="email" error={errors.email}>
          <input
            id="email"
            type="email"
            className={fieldClass(Boolean(errors.email))}
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            onBlur={() => checkField("email")}
            autoComplete="email"
          />
        </Field>
      </div>

      <div className="flex justify-end pt-2">
        <Button type="submit">Continue</Button>
      </div>

      <ValidationDialog {...prompt} />
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
