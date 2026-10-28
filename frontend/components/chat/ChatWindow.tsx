"use client";

import { Bot } from "lucide-react";
import { useState } from "react";

import { useChat } from "@/hooks/useChat";
import { chatApi } from "@/lib/chatApi";
import { createMessage } from "@/lib/messages";
import type { SendMessageFn } from "@/types/chat";

import { ChatInput } from "./ChatInput";
import { ChatMessageList } from "./ChatMessageList";
import { ErrorMessage } from "./ErrorMessage";

const GREETING = "Hi! I'm CartPilot. Ask me about products, orders or returns.";

interface ChatWindowProps {
  /** Defaults to the real FastAPI backend endpoint; pass a mock function for isolated unit tests. */
  sendMessageFn?: SendMessageFn;
  demoHint?: string;
}

export function ChatWindow({ sendMessageFn = chatApi, demoHint }: ChatWindowProps) {
  const [initialMessages] = useState(() => [createMessage("assistant", GREETING)]);
  const { messages, status, error, sendMessage, retry, dismissError } = useChat({
    sendMessageFn,
    initialMessages,
  });

  return (
    <section
      aria-label="CartPilot chat"
      className="mx-auto flex h-dvh w-full max-w-3xl flex-col overflow-hidden bg-slate-900/60 border border-slate-800/80 shadow-2xl shadow-black/50 backdrop-blur-md sm:h-[calc(100dvh-2rem)] sm:max-h-[48rem] sm:rounded-2xl"
    >
      <header className="flex items-center gap-3 border-b border-slate-800 bg-slate-900/90 px-4 py-3.5 backdrop-blur-md">
        <span
          aria-hidden="true"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/20"
        >
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
            CartPilot
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Online" />
          </h1>
          <p className="truncate text-xs text-slate-400">{demoHint ?? "AI support assistant · 30-Day Returns"}</p>
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
