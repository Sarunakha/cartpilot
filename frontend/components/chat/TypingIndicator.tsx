import { Bot } from "lucide-react";

const DOT_DELAYS_MS = [0, 150, 300];

export function TypingIndicator() {
  return (
    <div role="status" className="flex items-end gap-2">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700"
      >
        <Bot className="h-4 w-4" />
      </span>
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3">
        <span className="sr-only">CartPilot is typing…</span>
        {DOT_DELAYS_MS.map((delay) => (
          <span
            key={delay}
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-slate-400 motion-safe:animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
