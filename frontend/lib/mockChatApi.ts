import type { SendMessageFn } from "@/types/chat";

interface MockOptions {
  delayMs?: number;
}

/**
 * Temporary stand-in for the FastAPI `POST /chat` endpoint (Weeks 1-2).
 * - Replies after a short delay so the loading state is visible.
 * - A message containing the word "error" fails once, then succeeds on retry,
 *   so you can see the error banner and the Retry button working.
 * Replace with a real fetch call in Weeks 3-4.
 */
export function createMockChatApi({ delayMs = 900 }: MockOptions = {}): SendMessageFn {
  const failedOnce = new Set<string>();

  return async ({ message }) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    if (/error/i.test(message) && !failedOnce.has(message)) {
      failedOnce.add(message);
      throw new Error("The assistant could not be reached. Please try again.");
    }

    return {
      reply: `Thanks for your message! This is a simulated reply. You said: "${message}"`,
    };
  };
}

export const mockChatApi = createMockChatApi();
