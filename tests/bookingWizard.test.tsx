/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// The wizard's server actions are mocked so this test isolates what the client
// sends to them — the real pipeline is covered by the integration tests.
const assessTriageAction = vi.fn();
vi.mock("@/app/(site)/book/actions", () => ({
  assessTriageAction: (...args: unknown[]) => assessTriageAction(...args),
  submitBookingAction: vi.fn(),
  getAvailableSlotsAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { BookingWizard } from "@/components/patient/BookingWizard";

describe("BookingWizard", () => {
  it("assesses the answers the patient just gave, not an empty answer set", async () => {
    assessTriageAction.mockResolvedValue({ success: false, error: "stop here" });
    render(<BookingWizard initialCategory="general_consultation" initialDoctorId={null} />);

    fireEvent.change(screen.getByLabelText("First name"), { target: { value: "Demo" } });
    fireEvent.change(screen.getByLabelText("Last name"), { target: { value: "Patient" } });
    fireEvent.change(screen.getByLabelText("Date of birth"), { target: { value: "1980-05-12" } });
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "0412 345 678" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "demo.patient@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    fireEvent.change(await screen.findByRole("textbox"), { target: { value: "Annual check-up please." } });
    fireEvent.click(screen.getByRole("button", { name: /^continue$/i }));

    // Answer every question with its first option until the flow is complete.
    for (let i = 0; i < 30 && !screen.queryByRole("button", { name: /see my assessment/i }); i++) {
      const radio = screen.queryAllByRole("radio")[0];
      if (radio) fireEvent.click(radio);
      const slider = screen.queryByRole("slider");
      if (slider) {
        fireEvent.pointerDown(slider);
        fireEvent.change(slider, { target: { value: "3" } });
      }
      const box = screen.queryAllByRole("checkbox")[0];
      if (box) fireEvent.click(box);
      fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    }
    fireEvent.click(screen.getByRole("button", { name: /see my assessment/i }));

    await waitFor(() => expect(assessTriageAction).toHaveBeenCalledTimes(1));
    const [category, , answers] = assessTriageAction.mock.calls[0];
    expect(category).toBe("general_consultation");
    expect(answers).toHaveProperty("core_duration");
    expect(answers).toHaveProperty("core_severity", 3);

    // A failed assessment must be visible, with a way to retry — not a silent no-op.
    expect(await screen.findByText("stop here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });
});
