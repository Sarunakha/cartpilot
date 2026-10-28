"use client";

import { Bot, User } from "lucide-react";
import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";

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
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full shadow-sm",
          isUser ? "bg-indigo-100 text-indigo-700" : "bg-slate-200 text-slate-700",
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </span>
      <div className={cx("flex min-w-0 max-w-[85%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cx(
            "rounded-2xl px-4 py-2 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-br-sm bg-indigo-600 text-white"
              : "rounded-bl-sm border border-slate-200 bg-white text-slate-900",
          )}
        >
          <span className="sr-only">{isUser ? "You said: " : "CartPilot said: "}</span>
          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          ) : (
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="whitespace-pre-wrap break-words mb-2 last:mb-0 leading-relaxed">{children}</p>
                ),
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                em: ({ children }) => <em className="italic text-slate-800">{children}</em>,
                ul: ({ children }) => <ul className="my-2 list-disc pl-5 space-y-1 text-slate-800">{children}</ul>,
                ol: ({ children }) => <ol className="my-2 list-decimal pl-5 space-y-1 text-slate-800">{children}</ol>,
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                code: ({ children }) => (
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono text-indigo-700 border border-slate-200">
                    {children}
                  </code>
                ),
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 underline hover:text-indigo-800"
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
        <time dateTime={message.timestamp} suppressHydrationWarning className="text-xs text-slate-400">
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
