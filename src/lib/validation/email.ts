import { z } from "zod";

// One email rule for both sides of every form. The client forms previously used a
// looser regex than the server, so an address like "name@gmail,,,.com" passed step 1
// and was only rejected at final submission.

export const emailSchema = z.string().trim().email("Enter a valid email address").max(200);

/**
 * Returns a user-facing message for an invalid email, or null when it is valid.
 * Validity is decided by `emailSchema` alone, so the client can never accept or
 * reject differently from the server; the checks below only explain *what* is wrong.
 */
export function getEmailError(value: string): string | null {
  const email = value.trim();
  if (!email) return "Email is required.";
  if (emailSchema.safeParse(email).success) return null;
  return explainInvalidEmail(email);
}

function explainInvalidEmail(email: string): string {
  if (email.length > 200) return "Email must be 200 characters or fewer.";
  if (/\s/.test(email)) return "Email can't contain spaces.";
  if (email.includes(",")) return "Email can't contain commas. Did you mean a full stop (.)?";

  const atCount = email.split("@").length - 1;
  if (atCount === 0) return "Email is missing the @ symbol, e.g. name@example.com.";
  if (atCount > 1) return "Email can only contain one @ symbol.";

  const [local, domain] = email.split("@");
  if (!local) return "Email is missing your name before the @, e.g. name@example.com.";
  if (!domain) return "Email is missing the part after the @, e.g. gmail.com.";

  const badChar =
    [...local].find((c) => !/[A-Za-z0-9_'+\-.]/.test(c)) ?? [...domain].find((c) => !/[A-Za-z0-9\-.]/.test(c));
  if (badChar) return `Email can't contain the character "${badChar}".`;

  if (email.includes("..")) return "Email can't contain two full stops in a row (..).";
  if (local.startsWith(".") || local.endsWith(".")) return "The part before the @ can't start or end with a full stop.";

  if (!domain.includes(".")) return `Email is missing an ending after "${domain}", such as .com or .com.au.`;
  if (domain.endsWith(".")) return "Email is missing the ending after the last full stop, e.g. .com.";
  if (domain.startsWith(".")) return `Email is missing the provider name between "@" and "${domain}", e.g. @gmail.com.`;
  if (domain.split(".").some((part) => part.startsWith("-")))
    return "Each part after the @ must start with a letter or number.";

  const ending = domain.split(".").pop()!;
  if (!/^[A-Za-z]{2,}$/.test(ending))
    return `Email ending ".${ending}" isn't valid. It should be at least two letters, e.g. .com.`;

  return "Enter a valid email address, e.g. name@example.com.";
}
