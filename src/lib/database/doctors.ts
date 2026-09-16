import "server-only";
import { prisma } from "./prisma";
import type { AppointmentSlotView } from "@/types";

export async function getAvailableSlots(
  doctorId: string,
  now: Date = new Date(),
  take = 40,
): Promise<AppointmentSlotView[]> {
  const slots = await prisma.appointmentSlot.findMany({
    where: { doctorId, isBooked: false, startTime: { gte: now } },
    orderBy: { startTime: "asc" },
    take,
  });
  return slots.map((s) => ({
    id: s.id,
    doctorId: s.doctorId,
    startTime: s.startTime.toISOString(),
    durationMinutes: s.durationMinutes,
  }));
}

export async function getEarliestAvailableSlot(
  doctorId: string,
  now: Date = new Date(),
): Promise<AppointmentSlotView | null> {
  const slot = await prisma.appointmentSlot.findFirst({
    where: { doctorId, isBooked: false, startTime: { gte: now } },
    orderBy: { startTime: "asc" },
  });
  if (!slot) return null;
  return {
    id: slot.id,
    doctorId: slot.doctorId,
    startTime: slot.startTime.toISOString(),
    durationMinutes: slot.durationMinutes,
  };
}
