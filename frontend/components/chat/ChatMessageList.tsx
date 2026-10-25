"use client";

import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";

import { cx } from "@/lib/cx";
import { formatTime } from "@/lib/format";
import type { Message } from "@/types/chat";

import { TypingIndicator } from "./TypingIndicator";

interface ChatMessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

function MessageItem({ message }: { message: Message }) {
  const isUser = message.sender === "user";

  return (
    <li data-sender={message.sender} className={cx("flex items-end gap-2", isUser && "flex-row-reverse")}>
      <span
        aria-hidden="true"
        className={cx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-700",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className={cx("flex min-w-0 max-w-[85%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cx(
            "rounded-2xl px-4 py-2 text-sm leading-relaxed",
            isUser
              ? "rounded-br-sm bg-indigo-600 text-white"
              : "rounded-bl-sm border border-slate-200 bg-white text-slate-900",
          )}
        >
          <span className="sr-only">{isUser ? "You said: " : "CartPilot said: "}</span>
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        <time dateTime={message.timestamp} suppressHydrationWarning className="text-xs text-slate-600">
          {formatTime(message.timestamp)}
        </time>
      </div>
    </li>
  );
}

export function ChatMessageList({ messages, isLoading = false }: ChatMessageListProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    endRef.current?.scrollIntoView?.({ behavior: reduceMotion ? "auto" : "smooth", block: "end" });
  }, [messages.length, isLoading]);

  return (
    <div
      role="log"
      aria-label="Conversation"
      aria-live="polite"
      aria-relevant="additions"
      tabIndex={0}
      className="flex-1 overflow-y-auto px-3 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-600 sm:px-4"
    >
      <ol className="flex flex-col gap-4">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </ol>
      {isLoading && (
        <div className="mt-4">
          <TypingIndicator />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
