import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ErrorMessage } from "@/components/chat/ErrorMessage";

describe("ErrorMessage", () => {
  it("announces the error to assistive technology", () => {
    render(<ErrorMessage message="Could not reach the assistant." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Could not reach the assistant.");
  });

  it("calls onRetry when Retry is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorMessage message="Failed" onRetry={onRetry} />);

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("calls onDismiss when the dismiss button is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<ErrorMessage message="Failed" onDismiss={onDismiss} />);

    await user.click(screen.getByRole("button", { name: /dismiss error/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("renders no buttons when no handlers are given", () => {
    render(<ErrorMessage message="Failed" />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
