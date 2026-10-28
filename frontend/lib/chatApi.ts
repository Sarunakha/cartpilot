import type { SendMessageFn, SendMessageResponse } from "@/types/chat";

const DEFAULT_API_URL = "http://localhost:8000";

/**
 * Returns the configured backend API URL without trailing slash.
 */
export function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
  return envUrl && envUrl.length > 0 ? envUrl.replace(/\/+$/, "") : DEFAULT_API_URL;
}

/**
 * Production implementation of SendMessageFn that calls FastAPI's POST /chat endpoint.
 */
export const chatApi: SendMessageFn = async ({ message }): Promise<SendMessageResponse> => {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/chat`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message }),
    });
  } catch (networkErr) {
    throw new Error(
      "Unable to connect to CartPilot server. Please ensure the backend is running and try again."
    );
  }

  if (!response.ok) {
    let errorDetail = "Failed to communicate with the assistant.";
    try {
      const errorJson = await response.json();
      if (errorJson?.detail) {
        errorDetail = errorJson.detail;
      }
    } catch {
      errorDetail = `Server returned error (${response.status}: ${response.statusText})`;
    }
    throw new Error(errorDetail);
  }

  const data = (await response.json()) as SendMessageResponse;
  if (!data || typeof data.reply !== "string") {
    throw new Error("Invalid response format received from assistant.");
  }

  return { reply: data.reply };
};

