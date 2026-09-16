import type { Metadata } from "next";
import { BookingWizard } from "@/components/patient/BookingWizard";
import { CATEGORY_LIST } from "@/data/categories";
import { DOCTORS } from "@/data/doctors";
import type { ComplaintCategory } from "@/types";

export const metadata: Metadata = { title: "Book an Appointment" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; doctor?: string }>;
}) {
  const params = await searchParams;
  const initialCategory = CATEGORY_LIST.includes(params.category as ComplaintCategory)
    ? (params.category as ComplaintCategory)
    : null;
  const initialDoctorId = DOCTORS.some((d) => d.id === params.doctor) ? (params.doctor as string) : null;

  return <BookingWizard initialCategory={initialCategory} initialDoctorId={initialDoctorId} />;
}
