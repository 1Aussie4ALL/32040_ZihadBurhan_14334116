import { describe, it, expect } from "vitest";
import { getEmailError } from "@/lib/validation/email";
import { clinicianLoginSchema, patientDetailsSchema } from "@/lib/validation/schemas";

describe("email validation", () => {
  it.each([
    "zihadburhan@gmail.com",
    "first.last+tag@uni.edu.au",
    "clinician@meridianhealth.demo",
    "  padded@example.com  ",
  ])("accepts %s", (email) => {
    expect(getEmailError(email)).toBeNull();
  });

  it.each([
    ["zihadburhan@gmail,,,com", "commas"],
    ["zihadburhan@gmail,,,.com", "commas"],
    ["zihadburhan@gmail.,,,com", "commas"],
    ["zihad burhan@gmail.com", "spaces"],
    ["zihadburhan.gmail.com", "missing the @"],
    ["zihad@burhan@gmail.com", "one @"],
    ["@gmail.com", "before the @"],
    ["zihad@", "after the @"],
    ["zihad@gmail", 'ending after "gmail"'],
    ["zihad@gmail.", "after the last full stop"],
    ["zihad@.com", "provider name"],
    ["a@b..com", "two full stops"],
    [".zihad@gmail.com", "can't start or end with a full stop"],
    ["zihad#1@gmail.com", 'character "#"'],
    ["a@-b.com", "must start with a letter or number"],
    ["a@b.c", 'ending ".c"'],
    ["a@gmail.c0m", 'ending ".c0m"'],
    ["", "required"],
  ])("tells the user what is wrong with %j (%s)", (email, expected) => {
    expect(getEmailError(email)).toContain(expected);
  });

  it("uses the same rule as the server, so step 1 can't pass an address the final submit rejects", () => {
    const base = { firstName: "A", lastName: "B", dateOfBirth: "1990-01-01", phone: "0400000000" };
    for (const email of ["zihadburhan@gmail,,,.com", "a@b..com", "zihadburhan@gmail.com"]) {
      const clientOk = getEmailError(email) === null;
      expect(patientDetailsSchema.safeParse({ ...base, email }).success).toBe(clientOk);
      expect(clinicianLoginSchema.safeParse({ email, password: "x" }).success).toBe(clientOk);
    }
  });
});
