import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatMessageList } from "@/components/chat/ChatMessageList";
import type { Message } from "@/types/chat";

const messages: Message[] = [
  { id: "1", sender: "assistant", content: "Hi! How can I help?", timestamp: "2026-10-25T10:00:00.000Z" },
  { id: "2", sender: "user", content: "Do you have blue shoes?", timestamp: "2026-10-25T10:01:00.000Z" },
];

describe("ChatMessageList", () => {
  const scrollIntoView = vi.fn();

  beforeEach(() => {
    scrollIntoView.mockClear();
    window.HTMLElement.prototype.scrollIntoView = scrollIntoView;
  });

  it("exposes the conversation as a labelled, keyboard-focusable log", () => {
    render(<ChatMessageList messages={messages} />);

    const log = screen.getByRole("log", { name: "Conversation" });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveAttribute("tabindex", "0");
  });

  it("renders every message in order", () => {
    render(<ChatMessageList messages={messages} />);

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Hi! How can I help?")).toBeInTheDocument();
    expect(within(items[1]).getByText("Do you have blue shoes?")).toBeInTheDocument();
  });

  it("styles user and assistant messages differently", () => {
    render(<ChatMessageList messages={messages} />);

    const [assistantItem, userItem] = screen.getAllByRole("listitem");
    expect(assistantItem).toHaveAttribute("data-sender", "assistant");
    expect(userItem).toHaveAttribute("data-sender", "user");

    const assistantBubble = screen.getByText("Hi! How can I help?").parentElement;
    const userBubble = screen.getByText("Do you have blue shoes?").parentElement;
    expect(userBubble).toHaveClass("bg-indigo-600", "text-white");
    expect(assistantBubble).toHaveClass("bg-white");
    expect(assistantBubble).not.toHaveClass("bg-indigo-600");

    // User messages sit on the right, assistant messages on the left.
    expect(userItem).toHaveClass("flex-row-reverse");
    expect(assistantItem).not.toHaveClass("flex-row-reverse");
  });

  it("tells screen reader users who said each message", () => {
    render(<ChatMessageList messages={messages} />);

    expect(screen.getByText("CartPilot said:", { exact: false })).toBeInTheDocument();
    expect(screen.getByText("You said:", { exact: false })).toBeInTheDocument();
  });

  it("renders a machine-readable timestamp for each message", () => {
    const { container } = render(<ChatMessageList messages={messages} />);

    const times = container.querySelectorAll("time");
    expect(times).toHaveLength(2);
    expect(times[0]).toHaveAttribute("datetime", messages[0].timestamp);
    expect(times[1]).toHaveAttribute("datetime", messages[1].timestamp);
    expect(times[0].textContent).not.toBe("");
  });

  it("shows an accessible typing indicator while a reply is pending", () => {
    render(<ChatMessageList messages={messages} isLoading />);

    expect(screen.getByRole("status")).toHaveTextContent(/typing/i);
  });

  it("hides the typing indicator when not loading", () => {
    render(<ChatMessageList messages={messages} />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("scrolls to the newest message when messages are added", () => {
    const { rerender } = render(<ChatMessageList messages={messages} />);
    const callsAfterFirstRender = scrollIntoView.mock.calls.length;
    expect(callsAfterFirstRender).toBeGreaterThan(0);

    const next: Message[] = [
      ...messages,
      { id: "3", sender: "assistant", content: "Yes, in size 42.", timestamp: "2026-10-25T10:02:00.000Z" },
    ];
    rerender(<ChatMessageList messages={next} />);

    expect(scrollIntoView.mock.calls.length).toBeGreaterThan(callsAfterFirstRender);
  });

  it("preserves line breaks in message content", () => {
    render(
      <ChatMessageList
        messages={[{ id: "9", sender: "user", content: "line one\nline two", timestamp: "2026-10-25T10:00:00.000Z" }]}
      />,
    );

    expect(screen.getByText(/line one/)).toHaveClass("whitespace-pre-wrap");
  });
});
