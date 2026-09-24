import { describe, it, expect } from "vitest";
import { submitBookingAction } from "@/app/(site)/book/actions";
import { getPatientDetailsErrors, getPhoneError } from "@/lib/validation/patientDetails";
import type { PatientDetailsInput } from "@/types";

const PATIENT: PatientDetailsInput = {
  firstName: "Zihad",
  lastName: "Burhan",
  dateOfBirth: "1999-05-01",
  phone: "0412 345 678",
  email: "zihadburhan@gmail.com",
};

const BOOKING = {
  patient: PATIENT,
  category: "other",
  concernText: "Slight pain in my chest",
  answers: {},
  selectedDoctorId: "doc-1",
  selectedSlotId: "slot-1",
  insuranceType: "unsure",
  proceedDespiteWarning: false,
};

describe("mobile number validation (04 numbers only)", () => {
  it.each(["0412 345 678", "0412345678", "0412-345-678", "  0400 000 000  "])("accepts %s", (phone) => {
    expect(getPhoneError(phone)).toBeNull();
  });

  it.each([
    ["", "required"],
    ["+61 412 345 678", "instead of +61"],
    ["61412345678", "instead of +61"],
    ["0412 abc 678", "can't contain letters"],
    ["0412.345.678", 'can\'t contain "."'],
    ["(02) 9876 5432", 'can\'t contain "("'],
    ["02 9876 5432", "looks like a landline"],
    ["0398765432", "looks like a landline"],
    ["1412 345 678", "must start with 04"],
    ["0512 345 678", "must start with 04"],
    ["------", "too short (0 digits)"],
    ["0412 345", "too short (7 digits)"],
    ["0412 345 6789", "too long (11 digits)"],
  ])("tells the user what is wrong with %j (%s)", (phone, expected) => {
    expect(getPhoneError(phone)).toContain(expected);
  });
});

describe("patient details errors", () => {
  it("returns nothing for valid details", () => {
    expect(getPatientDetailsErrors(PATIENT)).toEqual({});
  });

  it("explains each invalid field specifically", () => {
    const errors = getPatientDetailsErrors({
      ...PATIENT,
      firstName: " ",
      dateOfBirth: "1850-01-01",
      phone: "0412.345.678",
      email: "zihadburhan@gmail,,,.com",
    });
    expect(errors).toEqual({
      firstName: "First name is required.",
      dateOfBirth: "Date of birth is too far in the past. Check the year.",
      phone: 'Mobile number can\'t contain ".". Use digits and spaces only, e.g. 0412 345 678.',
      email: "Email can't contain commas. Did you mean a full stop (.)?",
    });
  });

  it("flags a future date of birth", () => {
    expect(getPatientDetailsErrors({ ...PATIENT, dateOfBirth: "2999-01-01" }).dateOfBirth).toBe(
      "Date of birth can't be in the future.",
    );
  });

  it("copes with malformed submitted data instead of throwing", () => {
    expect(() => getPatientDetailsErrors(null)).not.toThrow();
    expect(getPatientDetailsErrors({ firstName: 42 }).firstName).toBe("First name is required.");
  });
});

describe("final submit explains what is wrong and where", () => {
  it("returns step-1 field errors when details that got past an older form are rejected", async () => {
    const res = await submitBookingAction({
      ...BOOKING,
      patient: { ...PATIENT, phone: "0412.345.678", email: "zihadburhan@gmail,,,.com" },
    });
    expect(res.success).toBe(false);
    if (res.success) return;
    expect(res.fieldErrors).toEqual([
      {
        step: 1,
        fieldId: "phone",
        message: 'Mobile number can\'t contain ".". Use digits and spaces only, e.g. 0412 345 678.',
      },
      { step: 1, fieldId: "email", message: "Email can't contain commas. Did you mean a full stop (.)?" },
    ]);
  });

  it("points each problem at its own step, earliest first", async () => {
    const res = await submitBookingAction({
      ...BOOKING,
      selectedSlotId: "",
      category: "not-a-category",
      patient: { ...PATIENT, email: "zihad@gmail" },
    });
    if (res.success) throw new Error("expected failure");
    expect(res.fieldErrors?.map((e) => [e.step, e.fieldId])).toEqual([
      [1, "email"],
      [2, "category-options"],
      [6, "slot-options"],
    ]);
    expect(res.fieldErrors?.[0].message).toBe('Email is missing an ending after "gmail", such as .com or .com.au.');
  });

  it("still gives a pointer when the request is unreadable", async () => {
    const res = await submitBookingAction("garbage");
    if (res.success) throw new Error("expected failure");
    expect(res.fieldErrors?.length).toBeGreaterThan(0);
    expect(res.fieldErrors?.every((e) => e.message.length > 0)).toBe(true);
  });
});
