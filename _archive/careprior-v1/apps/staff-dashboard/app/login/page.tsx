"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Disclaimer from "@/components/Disclaimer";
import { login, setSession, ApiError } from "@/lib/api";

const DEMO_ACCOUNTS = [
  { label: "Reception — reception@careprior.local", email: "reception@careprior.local" },
  { label: "Nurse / Clinical Reviewer — clinician@careprior.local", email: "clinician@careprior.local" },
  { label: "Practice Manager — manager@careprior.local", email: "manager@careprior.local" },
  { label: "System Administrator — admin@careprior.local", email: "admin@careprior.local" },
  { label: "Research Evaluator — researcher@careprior.local", email: "researcher@careprior.local" },
];

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_ACCOUNTS[1].email);
  const [password, setPassword] = useState("CarePriorDev!23");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.role === "patient") {
        setError("This is the staff dashboard. Patients should use the patient portal.");
        return;
      }
      setSession(result.access_token, result.refresh_token, result.role, result.user_id, result.full_name);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">CarePrior</p>
        <h1 className="text-2xl font-bold text-text-primary">Staff sign in</h1>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-bg-surface p-6 shadow-sm" noValidate>
        {error && (
          <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="account" className="block text-sm font-medium text-text-primary">Demo account</label>
          <select
            id="account"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm"
          >
            {DEMO_ACCOUNTS.map((a) => (
              <option key={a.email} value={a.email}>{a.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-primary">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in…" : "Sign in"}</Button>
      </form>
      <Disclaimer />
    </div>
  );
}
