"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/AuthProvider";

export default function ChatPanel() {
  const { member } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey! I'm your Project OS assistant. Ask me anything about the project, or tell me what you need help with." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          history: messages,
          userId: member?.email,
          page: pathname,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "No response." }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-20 z-50 w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg transition-all hover:scale-110"
        style={{ backgroundColor: open ? "#ef4444" : "#8b5cf6" }}
        title="Chat with AI Assistant"
      >
        {open ? "X" : "AI"}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed top-0 right-0 z-40 h-screen flex flex-col border-l shadow-2xl"
          style={{ width: "380px", backgroundColor: "#0a0e17", borderColor: "#1e293b" }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#1e293b] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-bold">
              AI
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">Project Assistant</p>
              <p className="text-[10px] text-[#475569] font-mono">{pathname}</p>
            </div>
            <button onClick={() => setOpen(false)} className="text-[#475569] hover:text-white text-sm">X</button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-blue-500/20 text-blue-100 rounded-br-sm"
                      : "bg-[#1e293b] text-[#e2e8f0] rounded-bl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-[#1e293b] rounded-xl px-3.5 py-2.5 text-xs text-[#475569]">
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-[#1e293b]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything..."
                className="flex-1 py-2.5 px-3 rounded-xl border border-[#1e293b] bg-[#0d1117] text-white text-sm outline-none focus:border-purple-500 placeholder-[#334155]"
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-purple-500 hover:bg-purple-600 transition disabled:opacity-30"
              >
                Send
              </button>
            </div>
            <p className="text-[9px] text-[#334155] mt-1.5 text-center">
              Powered by {member?.email ? "your configured LLM" : "AI"} — context-aware
            </p>
          </div>
        </div>
      )}
    </>
  );
}
