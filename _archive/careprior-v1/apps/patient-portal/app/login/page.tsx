"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import Disclaimer from "@/components/Disclaimer";
import { login, setSession, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("patient@careprior.local");
  const [password, setPassword] = useState("CarePriorDev!23");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.role !== "patient") {
        setError("This portal is for patient accounts. Staff should use the staff dashboard.");
        return;
      }
      setSession(result.access_token, result.refresh_token, result.role, result.user_id, result.full_name);
      router.push("/consent");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Patient login</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-card border border-border bg-bg-surface p-6 shadow-sm" noValidate>
        {error && (
          <div role="alert" className="rounded-input border border-status-immediate bg-status-immediate-bg px-3 py-2 text-sm text-status-immediate">
            {error}
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-primary">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="focus-ring mt-1 w-full rounded-input border border-border px-3 py-2 text-sm"
          />
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
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Logging in…" : "Log in"}
        </Button>
        <p className="text-xs text-text-muted">
          Demo account pre-filled: patient@careprior.local — synthetic data only, not a real patient.
        </p>
      </form>
      <Disclaimer />
    </main>
  );
}
