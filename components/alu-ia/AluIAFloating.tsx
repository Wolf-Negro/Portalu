"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { X, Zap, Send, MessageSquare } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Páginas que ya tienen su propia interfaz de ALU.IA — evita un botón duplicado.
const HIDDEN_ON = ["/dashboard", "/alu-ia"];

export default function AluIAFloating() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  if (HIDDEN_ON.some((p) => pathname?.startsWith(p))) return null;

  const cleanContent = (text: string) =>
    text.replace(/\[WIDGET:[a-z_]+\]/g, "").replace(/\[[A-Z]+:?[a-z_,]*$/, "").trimEnd();

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/alu-ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, context: "general" }),
      });
      if (!res.ok || !res.body) {
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Error al conectar con ALU.IA. Intenta de nuevo." },
        ]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullReply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content || "";
            fullReply += content;
            setMessages((prev) => [...prev.slice(0, -1), { role: "assistant", content: fullReply }]);
          } catch {
            // línea SSE incompleta — ignorar
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Error al conectar con ALU.IA. Intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <style>{`
        @keyframes aluFloatingSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>

      {open && (
        <div
          style={{
            position: "fixed", top: 0, right: 0, height: "100vh", width: 380, zIndex: 100,
            background: "var(--color-surface-1)", borderLeft: "1px solid rgba(114,85,180,0.3)",
            display: "flex", flexDirection: "column",
            animation: "aluFloatingSlideIn 0.25s ease",
            boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderBottom: "1px solid rgba(114,85,180,0.2)",
            background: "linear-gradient(135deg,rgba(43,9,111,0.4),rgba(114,85,180,0.15))",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Zap size={16} color="#fff" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>ALU.IA</div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-muted)", fontSize: 12 }}>
                Haz una pregunta a ALU.IA.
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "82%", padding: "9px 13px", borderRadius: 12,
                  background: msg.role === "user"
                    ? "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))"
                    : "rgba(255,255,255,0.06)",
                  border: msg.role === "assistant" ? "1px solid rgba(114,85,180,0.2)" : "none",
                  fontSize: 12.5, color: "var(--color-text-primary)", lineHeight: 1.55,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {cleanContent(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  padding: "9px 13px", borderRadius: 12,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(114,85,180,0.2)",
                  fontSize: 12, color: "var(--color-lavender)", fontStyle: "italic",
                }}>
                  ALU.IA está pensando...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(114,85,180,0.2)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta..."
              disabled={loading}
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(114,85,180,0.25)",
                borderRadius: 10, padding: "9px 13px", color: "var(--color-text-primary)", fontSize: 12.5, outline: "none",
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, opacity: loading || !input.trim() ? 0.4 : 1,
              }}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed", bottom: 24, right: 24, zIndex: 99,
            height: 52, borderRadius: 26, paddingLeft: 18, paddingRight: 18,
            border: "none", cursor: "pointer",
            background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
            display: "flex", alignItems: "center", gap: 9,
            boxShadow: "0 6px 24px rgba(43,9,111,0.5)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 10px 30px rgba(43,9,111,0.65)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(43,9,111,0.5)";
          }}
        >
          <MessageSquare size={18} color="#fff" />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>ALU.IA</span>
        </button>
      )}
    </>
  );
}
