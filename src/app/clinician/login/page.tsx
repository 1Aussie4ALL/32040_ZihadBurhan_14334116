import type { Metadata } from "next";
import { Container, Card } from "@/components/common/Card";
import { LoginForm } from "@/components/clinician/LoginForm";

export const metadata: Metadata = { title: "Sign In" };

export default function ClinicianLoginPage() {
  return (
    <Container className="flex min-h-[calc(100vh-4rem)] items-center justify-center py-14">
      <Card className="w-full max-w-sm p-6 sm:p-8">
        <h1 className="text-xl font-semibold text-slate-900">Clinician / reception sign in</h1>
        <p className="mt-1 text-sm text-muted">Demo authentication for this academic prototype.</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </Card>
    </Container>
  );
}
