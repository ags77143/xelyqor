"use client";
import { useState, useRef, useEffect } from "react";
import { Send, X, MessageCircle } from "lucide-react";
import { apiPost } from "@/lib/api";
import toast from "react-hot-toast";

export default function ChatPanel({ lectureId, lectureName, chatbotName, chatbotTone }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset messages when lecture changes
  useEffect(() => {
    setMessages([]);
  }, [lectureId]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const newMsg = { role: "user", content: input.trim() };
    const updated = [...messages, newMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);
    try {
      let reply;
      if (lectureId) {
        const res = await apiPost("/chat/", {
          lecture_id: lectureId,
          messages: updated,
          chatbot_name: chatbotName || "Tutor",
          chatbot_tone: chatbotTone || "friendly",
        });
        reply = res.reply;
      } else {
        const res = await apiPost("/chat/general", {
          messages: updated,
          chatbot_name: chatbotName || "Tutor",
          chatbot_tone: chatbotTone || "friendly",
        });
        reply = res.reply;
      }
      setMessages([...updated, { role: "assistant", content: reply }]);
    } catch (e) {
      toast.error("Chat error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-3 bg-amber text-white font-semibold rounded-2xl shadow-lg hover:bg-amber-light transition-all z-40 text-sm"
        >
          <MessageCircle size={18} />
          {chatbotName || "Tutor"}
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-0 right-0 w-80 h-[520px] bg-white border-l border-t border-cream-darker shadow-2xl flex flex-col z-40 rounded-tl-2xl">
          {/* Header */}
          <div className="px-5 py-4 border-b border-cream-darker flex items-center justify-between flex-shrink-0">
            <div>
              <h3 className="font-serif text-base text-ink">{chatbotName || "Tutor"}</h3>
              <p className="text-xs text-ink-light mt-0.5">
                {lectureId ? `Lecture: ${lectureName || "current"}` : "General study assistant"}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-ink-light hover:text-ink transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8 text-xs text-ink-light leading-relaxed">
                <div className="text-3xl mb-3">💬</div>
                {lectureId
                  ? "Ask anything about this lecture — concepts, examples, exam tips."
                  : "Ask me anything — concepts, study tips, explanations."}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${m.role === "user" ? "bg-amber text-white rounded-tr-sm" : "bg-cream text-ink rounded-tl-sm"}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-cream rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-light animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-light animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-ink-light animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-cream-darker flex-shrink-0">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 rounded-xl border border-cream-darker bg-cream text-ink text-xs focus:outline-none focus:ring-2 focus:ring-amber/40"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="w-9 h-9 flex items-center justify-center bg-amber text-white rounded-xl hover:bg-amber-light transition-colors disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}