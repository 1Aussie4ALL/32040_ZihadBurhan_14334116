/** @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UrgencyBadge } from "@/components/common/UrgencyBadge";

describe("UrgencyBadge", () => {
  it("renders the urgency label as visible text, not just a colour", () => {
    render(<UrgencyBadge level="Emergency" />);
    expect(screen.getByText("Emergency")).toBeInTheDocument();
  });

  it("renders a distinct label for each urgency level", () => {
    const levels = ["Emergency", "Urgent", "Priority", "Routine", "InsufficientInformation"] as const;
    for (const level of levels) {
      const { unmount } = render(<UrgencyBadge level={level} />);
      expect(screen.getByText(level === "InsufficientInformation" ? "Insufficient Information" : level)).toBeInTheDocument();
      unmount();
    }
  });
});
