import { ChatWindow } from "@/components/chat/ChatWindow";

export default function Home() {
  return (
    <main className="min-h-dvh bg-slate-100 sm:p-4">
      <ChatWindow demoHint='Demo mode · replies are simulated. Type "error" to see the error state.' />
    </main>
  );
}
