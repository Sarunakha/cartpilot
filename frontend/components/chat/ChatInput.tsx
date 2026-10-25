"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { cx } from "@/lib/cx";
import { MAX_MESSAGE_LENGTH, validateMessage } from "@/lib/validation";

interface ChatInputProps {
  onSend: (message: string) => void | Promise<void>;
  disabled?: boolean;
}

const MAX_TEXTAREA_HEIGHT_PX = 160;
const WARN_AT = Math.floor(MAX_MESSAGE_LENGTH * 0.9);

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [value, setValue] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const wasDisabledRef = useRef(disabled);

  const id = useId();
  const inputId = `${id}-input`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const counterId = `${id}-counter`;

  const overLimit = value.length > MAX_MESSAGE_LENGTH;
  const error = submitError ?? (overLimit ? validateMessage(value) : null);

  // Grow the textarea with its content, up to a maximum height.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
  }, [value]);

  // Return focus to the input when a pending reply finishes.
  useEffect(() => {
    if (wasDisabledRef.current && !disabled) textareaRef.current?.focus();
    wasDisabledRef.current = disabled;
  }, [disabled]);

  function submit() {
    if (disabled) return;
    const validationError = validateMessage(value);
    if (validationError) {
      setSubmitError(validationError);
      textareaRef.current?.focus();
      return;
    }
    const text = value.trim();
    setValue("");
    setSubmitError(null);
    void onSend(text);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Enter sends; Shift+Enter inserts a new line; ignore Enter while composing (IME).
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label="Send a message"
      className="border-t border-slate-200 bg-white p-3 sm:p-4"
    >
      <label htmlFor={inputId} className="sr-only">
        Message
      </label>
      <div className="flex items-end gap-2">
        <textarea
          id={inputId}
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={disabled}
          placeholder="Ask about products, orders or returns…"
          aria-invalid={Boolean(error)}
          aria-describedby={`${error ? errorId : hintId} ${counterId}`}
          onChange={(event) => {
            setValue(event.target.value);
            setSubmitError(null);
          }}
          onKeyDown={handleKeyDown}
          className={cx(
            "block max-h-40 min-h-11 w-full min-w-0 flex-1 resize-none rounded-xl border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500",
            "focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:bg-slate-100",
            error
              ? "border-red-500 focus-visible:ring-red-600"
              : "border-slate-300 focus-visible:ring-indigo-600",
          )}
        />
        <button
          type="submit"
          disabled={disabled}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <SendHorizontal aria-hidden="true" className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
        {error ? (
          <p id={errorId} role="alert" className="text-red-700">
            {error}
          </p>
        ) : (
          <p id={hintId} className="text-slate-600">
            Enter to send · Shift+Enter for a new line
          </p>
        )}
        <p
          id={counterId}
          className={cx(
            "shrink-0 tabular-nums",
            overLimit ? "font-semibold text-red-700" : value.length >= WARN_AT ? "text-amber-700" : "text-slate-600",
          )}
        >
          {`${value.length}/${MAX_MESSAGE_LENGTH}`}
        </p>
      </div>
    </form>
  );
}
