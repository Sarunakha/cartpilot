import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatWindow } from "@/components/chat/ChatWindow";
import type { SendMessageResponse } from "@/types/chat";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const getTextbox = () => screen.getByRole("textbox", { name: /message/i });

describe("ChatWindow (integration)", () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it("starts with the assistant greeting", () => {
    render(<ChatWindow sendMessageFn={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "CartPilot" })).toBeInTheDocument();
    expect(screen.getByText(/ask me about products/i)).toBeInTheDocument();
  });

  it("goes idle → loading → success when a message is sent", async () => {
    const user = userEvent.setup();
    const pending = deferred<SendMessageResponse>();
    render(<ChatWindow sendMessageFn={vi.fn().mockReturnValue(pending.promise)} />);

    await user.type(getTextbox(), "Do you have blue shoes?{Enter}");

    expect(screen.getByText("Do you have blue shoes?")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/typing/i);
    expect(getTextbox()).toBeDisabled();
    expect(screen.getByRole("button", { name: /send message/i })).toBeDisabled();

    pending.resolve({ reply: "Yes, we do!" });

    expect(await screen.findByText("Yes, we do!")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(getTextbox()).toBeEnabled();
  });

  it("shows an error banner on failure and recovers with Retry", async () => {
    const user = userEvent.setup();
    const sendMessageFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Could not reach the assistant."))
      .mockResolvedValueOnce({ reply: "Back online!" });
    render(<ChatWindow sendMessageFn={sendMessageFn} />);

    await user.type(getTextbox(), "Hello{Enter}");

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not reach the assistant.");

    await user.click(screen.getByRole("button", { name: /retry/i }));

    expect(await screen.findByText("Back online!")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getAllByText("Hello")).toHaveLength(1);
  });

  it("does not call the API for an empty message", async () => {
    const user = userEvent.setup();
    const sendMessageFn = vi.fn();
    render(<ChatWindow sendMessageFn={sendMessageFn} />);

    await user.click(screen.getByRole("button", { name: /send message/i }));

    expect(sendMessageFn).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/enter a message/i);
  });
});
