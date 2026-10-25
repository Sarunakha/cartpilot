import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useChat } from "@/hooks/useChat";
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

describe("useChat", () => {
  it("adds the user message and the assistant reply on success", async () => {
    const sendMessageFn = vi.fn().mockResolvedValue({ reply: "Hello!" });
    const { result } = renderHook(() => useChat({ sendMessageFn }));

    await act(() => result.current.sendMessage("  Hi  "));

    expect(sendMessageFn).toHaveBeenCalledWith({ message: "Hi" });
    expect(result.current.messages.map((m) => [m.sender, m.content])).toEqual([
      ["user", "Hi"],
      ["assistant", "Hello!"],
    ]);
    expect(result.current.status).toBe("success");
    expect(result.current.error).toBeNull();
  });

  it("is in the loading state while the reply is pending", async () => {
    const pending = deferred<SendMessageResponse>();
    const sendMessageFn = vi.fn().mockReturnValue(pending.promise);
    const { result } = renderHook(() => useChat({ sendMessageFn }));

    let sending!: Promise<void>;
    act(() => {
      sending = result.current.sendMessage("Hi");
    });
    expect(result.current.status).toBe("loading");

    await act(async () => {
      pending.resolve({ reply: "Done" });
      await sending;
    });
    expect(result.current.status).toBe("success");
  });

  it("keeps the user message and reports an error when the request fails", async () => {
    const sendMessageFn = vi.fn().mockRejectedValue(new Error("Network down"));
    const { result } = renderHook(() => useChat({ sendMessageFn }));

    await act(() => result.current.sendMessage("Hi"));

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("Network down");
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]).toMatchObject({ sender: "user", content: "Hi" });
  });

  it("retries the failed message without duplicating it", async () => {
    const sendMessageFn = vi
      .fn()
      .mockRejectedValueOnce(new Error("Temporary failure"))
      .mockResolvedValueOnce({ reply: "Recovered" });
    const { result } = renderHook(() => useChat({ sendMessageFn }));

    await act(() => result.current.sendMessage("Hi"));
    expect(result.current.status).toBe("error");

    await act(() => result.current.retry());

    expect(sendMessageFn).toHaveBeenCalledTimes(2);
    expect(sendMessageFn).toHaveBeenLastCalledWith({ message: "Hi" });
    expect(result.current.status).toBe("success");
    expect(result.current.error).toBeNull();
    expect(result.current.messages.map((m) => m.sender)).toEqual(["user", "assistant"]);
  });

  it("uses a generic message when the failure has no message", async () => {
    const sendMessageFn = vi.fn().mockRejectedValue("boom");
    const { result } = renderHook(() => useChat({ sendMessageFn }));

    await act(() => result.current.sendMessage("Hi"));

    expect(result.current.error).toMatch(/something went wrong/i);
  });

  it("clears the error when dismissed", async () => {
    const sendMessageFn = vi.fn().mockRejectedValue(new Error("Nope"));
    const { result } = renderHook(() => useChat({ sendMessageFn }));

    await act(() => result.current.sendMessage("Hi"));
    act(() => result.current.dismissError());

    expect(result.current.status).toBe("idle");
    expect(result.current.error).toBeNull();
  });

  it("does not send empty or over-long messages", async () => {
    const sendMessageFn = vi.fn();
    const { result } = renderHook(() => useChat({ sendMessageFn }));

    await act(() => result.current.sendMessage("   "));
    await act(() => result.current.sendMessage("a".repeat(1001)));

    expect(sendMessageFn).not.toHaveBeenCalled();
    expect(result.current.messages).toHaveLength(0);
  });

  it("ignores a second message while one is in flight", async () => {
    const pending = deferred<SendMessageResponse>();
    const sendMessageFn = vi.fn().mockReturnValue(pending.promise);
    const { result } = renderHook(() => useChat({ sendMessageFn }));

    let first!: Promise<void>;
    act(() => {
      first = result.current.sendMessage("one");
    });
    await act(() => result.current.sendMessage("two"));

    expect(sendMessageFn).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve({ reply: "ok" });
      await first;
    });
  });
});
