"use client";

import { Bot } from "lucide-react";
import { useState } from "react";

import { useChat } from "@/hooks/useChat";
import { createMessage } from "@/lib/messages";
import { mockChatApi } from "@/lib/mockChatApi";
import type { SendMessageFn } from "@/types/chat";

import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";
import { ErrorMessage } from "./ErrorMessage";

const GREETING = "Hi! I'm CartPilot. Ask me about products, orders or returns.";

interface ChatWindowProps {
  /** Defaults to the mock handler; pass a real API function in Weeks 3-4. */
  sendMessageFn?: SendMessageFn;
  demoHint?: string;
}

export function ChatWindow({ sendMessageFn = mockChatApi, demoHint }: ChatWindowProps) {
  const [initialMessages] = useState(() => [createMessage("assistant", GREETING)]);
  const { messages, status, error, sendMessage, retry, dismissError } = useChat({
    sendMessageFn,
    initialMessages,
  });

  return (
    <section
      aria-label="CartPilot chat"
      className="mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden bg-slate-50 sm:h-[calc(100dvh-2rem)] sm:max-h-[48rem] sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-sm"
    >
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white"
        >
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900">CartPilot</h1>
          <p className="truncate text-xs text-slate-600">{demoHint ?? "AI support assistant"}</p>
        </div>
      </header>

      <ChatMessageList messages={messages} isLoading={status === "loading"} />

      {status === "error" && error && (
        <div className="px-3 pb-2 sm:px-4">
          <ErrorMessage message={error} onRetry={retry} onDismiss={dismissError} />
        </div>
      )}

      <ChatInput onSend={sendMessage} disabled={status === "loading"} />
    </section>
  );
}
