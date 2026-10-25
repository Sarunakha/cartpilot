export type MessageSender = "user" | "assistant";

export interface Message {
  id: string;
  sender: MessageSender;
  content: string;
  /** ISO 8601 string, so messages stay serializable. */
  timestamp: string;
}

export type ChatStatus = "idle" | "loading" | "success" | "error";

export interface ChatState {
  messages: Message[];
  status: ChatStatus;
  error: string | null;
}

/** Matches the FastAPI `POST /chat` contract. */
export interface SendMessageRequest {
  message: string;
}

export interface SendMessageResponse {
  reply: string;
}

export type SendMessageFn = (request: SendMessageRequest) => Promise<SendMessageResponse>;
