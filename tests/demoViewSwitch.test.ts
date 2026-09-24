import { afterEach, describe, it, expect, vi } from "vitest";
import { isDemoQuickSwitchEnabled, loginDemoReception } from "@/lib/auth/session";

// The Patient / Reception switcher signs in without a password, so it must be
// impossible outside `next dev`.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("demo view switcher", () => {
  it("is enabled only under next dev", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(isDemoQuickSwitchEnabled()).toBe(true);

    for (const env of ["production", "test"]) {
      vi.stubEnv("NODE_ENV", env);
      expect(isDemoQuickSwitchEnabled()).toBe(false);
    }
  });

  it("refuses the password-free sign-in in a production build", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(loginDemoReception()).resolves.toBe(false);
  });
});
