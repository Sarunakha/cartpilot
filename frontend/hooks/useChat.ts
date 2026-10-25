"use client";

import { useCallback, useRef, useState } from "react";

import { createMessage } from "@/lib/messages";
import { validateMessage } from "@/lib/validation";
import type { ChatState, Message, SendMessageFn } from "@/types/chat";

interface UseChatOptions {
  sendMessageFn: SendMessageFn;
  initialMessages?: Message[];
}

const FALLBACK_ERROR = "Something went wrong. Please try again.";

export function useChat({ sendMessageFn, initialMessages = [] }: UseChatOptions) {
  const [state, setState] = useState<ChatState>({
    messages: initialMessages,
    status: "idle",
    error: null,
  });
  const lastRequestRef = useRef<string | null>(null);
  const inFlightRef = useRef(false);

  const request = useCallback(
    async (text: string) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      lastRequestRef.current = text;
      setState((prev) => ({ ...prev, status: "loading", error: null }));

      try {
        const { reply } = await sendMessageFn({ message: text });
        lastRequestRef.current = null;
        setState((prev) => ({
          messages: [...prev.messages, createMessage("assistant", reply)],
          status: "success",
          error: null,
        }));
      } catch (err) {
        const message = err instanceof Error && err.message ? err.message : FALLBACK_ERROR;
        setState((prev) => ({ ...prev, status: "error", error: message }));
      } finally {
        inFlightRef.current = false;
      }
    },
    [sendMessageFn],
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (inFlightRef.current || validateMessage(text)) return;
      const content = text.trim();
      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, createMessage("user", content)],
      }));
      await request(content);
    },
    [request],
  );

  /** Re-sends the last failed message without adding a duplicate bubble. */
  const retry = useCallback(async () => {
    if (lastRequestRef.current) await request(lastRequestRef.current);
  }, [request]);

  const dismissError = useCallback(() => {
    lastRequestRef.current = null;
    setState((prev) => (prev.status === "error" ? { ...prev, status: "idle", error: null } : prev));
  }, []);

  return { ...state, sendMessage, retry, dismissError };
}
