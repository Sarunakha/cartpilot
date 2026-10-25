import type { Message, MessageSender } from "@/types/chat";

let counter = 0;

export function createMessage(sender: MessageSender, content: string): Message {
  counter += 1;
  return {
    id: `${sender}-${Date.now()}-${counter}`,
    sender,
    content,
    timestamp: new Date().toISOString(),
  };
}
