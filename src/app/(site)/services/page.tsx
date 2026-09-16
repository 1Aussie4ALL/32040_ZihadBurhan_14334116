import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container, Card } from "@/components/common/Card";
import { CATEGORY_LIST, CATEGORY_META } from "@/data/categories";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold text-slate-900">Services</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Meridian Health Clinic offers general practice appointments across the areas below. When you request
        an appointment, choosing the closest category helps us ask the right follow-up questions.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_LIST.map((category) => (
          <Card key={category} className="flex flex-col p-5">
            <p className="font-semibold text-slate-900">{CATEGORY_META[category].label}</p>
            <p className="mt-1 flex-1 text-sm leading-relaxed text-muted">{CATEGORY_META[category].description}</p>
            <Link
              href={`/book?category=${category}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand hover:underline"
            >
              Request an appointment <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </Card>
        ))}
      </div>
    </Container>
  );
}
