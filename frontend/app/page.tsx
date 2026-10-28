import { ChatWindow } from "@/components/chat/ChatWindow";

export default function Home() {
  return (
    <main className="min-h-dvh bg-gradient-to-br from-slate-900 via-gray-900 to-slate-950 flex flex-col justify-center items-center sm:p-4">
      <ChatWindow />
    </main>
  );
}
