import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ChatInput } from "@/components/chat/ChatInput";
import { MAX_MESSAGE_LENGTH } from "@/lib/validation";

const getTextbox = () => screen.getByRole("textbox", { name: /message/i });
const getSendButton = () => screen.getByRole("button", { name: /send message/i });

describe("ChatInput", () => {
  it("renders an accessible textbox, send button and character counter", () => {
    render(<ChatInput onSend={vi.fn()} />);

    expect(getTextbox()).toBeInTheDocument();
    expect(getSendButton()).toBeEnabled();
    expect(screen.getByText(`0/${MAX_MESSAGE_LENGTH}`)).toBeInTheDocument();
  });

  it("updates the character counter as the user types", async () => {
    const user = userEvent.setup();
    render(<ChatInput onSend={vi.fn()} />);

    await user.type(getTextbox(), "abc");

    expect(screen.getByText(`3/${MAX_MESSAGE_LENGTH}`)).toBeInTheDocument();
  });

  describe("validation", () => {
    it("rejects an empty message and shows an error", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      await user.click(getSendButton());

      expect(onSend).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent(/enter a message/i);
      expect(getTextbox()).toHaveAttribute("aria-invalid", "true");
    });

    it("rejects a whitespace-only message", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      await user.type(getTextbox(), "   ");
      await user.click(getSendButton());

      expect(onSend).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    it("rejects a message over 1,000 characters, by click and by Enter", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      fireEvent.change(getTextbox(), { target: { value: "a".repeat(MAX_MESSAGE_LENGTH + 1) } });

      expect(screen.getByText(`${MAX_MESSAGE_LENGTH + 1}/${MAX_MESSAGE_LENGTH}`)).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(/too long/i);
      expect(getTextbox()).toHaveAttribute("aria-invalid", "true");

      await user.click(getSendButton());
      fireEvent.keyDown(getTextbox(), { key: "Enter" });

      expect(onSend).not.toHaveBeenCalled();
    });

    it("accepts a message of exactly 1,000 characters", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);
      const text = "a".repeat(MAX_MESSAGE_LENGTH);

      fireEvent.change(getTextbox(), { target: { value: text } });
      await user.click(getSendButton());

      expect(onSend).toHaveBeenCalledWith(text);
    });

    it("clears the error once the user edits the message", async () => {
      const user = userEvent.setup();
      render(<ChatInput onSend={vi.fn()} />);

      await user.click(getSendButton());
      expect(screen.getByRole("alert")).toBeInTheDocument();

      await user.type(getTextbox(), "h");

      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(getTextbox()).toHaveAttribute("aria-invalid", "false");
    });
  });

  describe("keyboard", () => {
    it("sends the trimmed message on Enter and clears the field", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      await user.type(getTextbox(), "  Hello there  {Enter}");

      expect(onSend).toHaveBeenCalledTimes(1);
      expect(onSend).toHaveBeenCalledWith("Hello there");
      expect(getTextbox()).toHaveValue("");
    });

    it("inserts a new line on Shift+Enter without sending", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      await user.type(getTextbox(), "line one{Shift>}{Enter}{/Shift}line two");

      expect(onSend).not.toHaveBeenCalled();
      expect(getTextbox()).toHaveValue("line one\nline two");
    });

    it("can be reached and operated with the keyboard only", async () => {
      const user = userEvent.setup();
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);

      await user.tab();
      expect(getTextbox()).toHaveFocus();

      await user.keyboard("Hi");
      await user.tab();
      expect(getSendButton()).toHaveFocus();

      await user.keyboard("{Enter}");
      expect(onSend).toHaveBeenCalledWith("Hi");
    });
  });

  describe("disabled state", () => {
    it("disables the textbox and send button while a reply is pending", () => {
      render(<ChatInput onSend={vi.fn()} disabled />);

      expect(getTextbox()).toBeDisabled();
      expect(getSendButton()).toBeDisabled();
    });

    it("returns focus to the textbox when it becomes enabled again", () => {
      const { rerender } = render(<ChatInput onSend={vi.fn()} disabled />);

      rerender(<ChatInput onSend={vi.fn()} disabled={false} />);

      expect(getTextbox()).toHaveFocus();
    });
  });
});
