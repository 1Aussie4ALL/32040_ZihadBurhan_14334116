"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { ValidationDialog, useValidationPrompt } from "@/components/common/ValidationPrompt";
import { getEmailError } from "@/lib/validation/email";
import { loginAction } from "@/app/clinician/actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const prompt = useValidationPrompt();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailError = getEmailError(email);
    const ok = prompt.report([
      ...(emailError ? [{ fieldId: "email", message: emailError }] : []),
      ...(password ? [] : [{ fieldId: "password", message: "Password is required." }]),
    ]);
    if (!ok) return;
    setLoading(true);
    setError(null);
    const res = await loginAction(email, password);
    setLoading(false);
    if (res.success) {
      router.push("/clinician/dashboard");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-brand"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <Button type="submit" fullWidth disabled={loading}>
        {loading ? "Signing in…" : "Sign in"}
      </Button>
      <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted">
        <p className="font-semibold">Demo credentials</p>
        <p>clinician@meridianhealth.demo / TriageDemo!23</p>
        <p>reception@meridianhealth.demo / TriageDemo!23</p>
      </div>

      <ValidationDialog {...prompt} />
    </form>
  );
}
