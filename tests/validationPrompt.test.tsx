/** @vitest-environment jsdom */
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { DetailsForm } from "@/components/patient/DetailsForm";
import { ConcernForm } from "@/components/patient/ConcernForm";
import { ValidationDialog, useValidationPrompt } from "@/components/common/ValidationPrompt";

const EMPTY = { firstName: "", lastName: "", dateOfBirth: "", sex: undefined, phone: "", email: "" };

describe("validation prompt", () => {
  it("opens a centred dialog listing every missing field and flashes each one", () => {
    const onNext = vi.fn();
    render(<DetailsForm value={EMPTY} onNext={onNext} />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("Please complete 5 fields");
    expect(dialog).toHaveTextContent("First name is required.");
    expect(dialog).toHaveTextContent("Email is required.");
    for (const id of ["firstName", "lastName", "dateOfBirth", "phone", "email"]) {
      expect(document.getElementById(id)).toHaveAttribute("data-flash");
    }
    expect(onNext).not.toHaveBeenCalled();
  });

  it("closes on 'Show me', focusing the first missing field", () => {
    render(<DetailsForm value={EMPTY} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.click(screen.getByRole("button", { name: "Show me" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(document.getElementById("firstName"));
  });

  it("closes on Escape", () => {
    render(<DetailsForm value={EMPTY} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does not open when the form is complete", () => {
    const onNext = vi.fn();
    render(
      <DetailsForm
        value={{ ...EMPTY, firstName: "Ada", lastName: "Lee", dateOfBirth: "1990-01-01", phone: "0400000000", email: "a@b.co" }}
        onNext={onNext}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("flags both the category group and the description when neither is given", () => {
    render(<ConcernForm initialCategory={null} initialConcernText="" onBack={vi.fn()} onNext={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("Please complete 2 fields");
    expect(document.getElementById("category-options")).toHaveAttribute("data-flash");
    expect(document.getElementById("concernText")).toHaveAttribute("data-flash");
  });

  it("explains a bad value when the patient leaves the field, not only on submit", () => {
    render(<DetailsForm value={EMPTY} onNext={vi.fn()} />);
    const phone = document.getElementById("phone")!;
    fireEvent.change(phone, { target: { value: "0412.345.678" } });
    fireEvent.blur(phone);

    expect(screen.getByText(/Mobile number can't contain "\."/)).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does not nag about an empty field the patient merely tabbed past", () => {
    render(<DetailsForm value={EMPTY} onNext={vi.fn()} />);
    fireEvent.blur(document.getElementById("email")!);

    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
  });

  it("shows errors handed back from the final submit on arrival", () => {
    render(
      <DetailsForm
        value={{ ...EMPTY, email: "zihad@gmail" }}
        initialErrors={{ email: 'Email is missing an ending after "gmail", such as .com or .com.au.' }}
        notice="Please fix the highlighted details."
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText(/missing an ending after "gmail"/)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Please fix the highlighted details.");
  });

  it("labels each problem with its step and runs beforeReveal to navigate there", () => {
    function Wizard() {
      const prompt = useValidationPrompt();
      const [step, setStep] = useState(6);
      return (
        <>
          <p>Step {step}</p>
          {step === 1 && <input id="email" aria-label="Email" />}
          <button
            onClick={() =>
              prompt.report([{ fieldId: "email", message: "Email is missing the @ symbol.", section: "Your details" }], {
                title: "We couldn't send your request yet",
                actionLabel: "Go to Your details",
                beforeReveal: () => setStep(1),
              })
            }
          >
            Submit
          </button>
          <ValidationDialog {...prompt} />
        </>
      );
    }
    render(<Wizard />);
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));

    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("We couldn't send your request yet");
    expect(dialog).toHaveTextContent("Your details: Email is missing the @ symbol.");

    fireEvent.click(screen.getByRole("button", { name: "Go to Your details" }));

    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(document.activeElement).toBe(screen.getByLabelText("Email"));
    expect(screen.getByLabelText("Email")).toHaveAttribute("data-flash");
  });
});
