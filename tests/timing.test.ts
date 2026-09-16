import { describe, it, expect } from "vitest";
import { assessAppointmentTiming } from "@/lib/triage/timing";

const NOW = new Date("2026-01-01T09:00:00");
function hoursFromNow(hours: number): Date {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

describe("appointment timing guidance (section 12/13)", () => {
  it("always flags an Emergency slot as inappropriate, no matter how soon", () => {
    const result = assessAppointmentTiming("Emergency", hoursFromNow(0.1), NOW);
    expect(result.appropriate).toBe(false);
    expect(result.isEmergencyOverride).toBe(true);
  });

  it("flags an Urgent case booked 6 days out as too late", () => {
    const result = assessAppointmentTiming("Urgent", hoursFromNow(24 * 6), NOW);
    expect(result.appropriate).toBe(false);
    expect(result.isEmergencyOverride).toBe(false);
    expect(result.message).toMatch(/earlier appointment/i);
  });

  it("accepts an Urgent case booked within 24 hours", () => {
    const result = assessAppointmentTiming("Urgent", hoursFromNow(12), NOW);
    expect(result.appropriate).toBe(true);
  });

  it("matches the worked example from the spec: Priority + 6 days away is flagged", () => {
    const result = assessAppointmentTiming("Priority", hoursFromNow(24 * 6), NOW);
    expect(result.appropriate).toBe(false);
  });

  it("accepts a Priority case within 48 hours", () => {
    const result = assessAppointmentTiming("Priority", hoursFromNow(36), NOW);
    expect(result.appropriate).toBe(true);
  });

  it("accepts any Routine booking, even far in the future", () => {
    const result = assessAppointmentTiming("Routine", hoursFromNow(24 * 30), NOW);
    expect(result.appropriate).toBe(true);
    expect(result.message).toBeNull();
  });
});
