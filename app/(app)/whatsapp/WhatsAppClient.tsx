"use client";

import { useState } from "react";
import { MessageSquare, Send, Phone, Search, Tag } from "lucide-react";

type LocalMessage = {
  id: string;
  content: string;
  direction: "inbound" | "outbound";
  createdAt: Date | string;
};

export default function WhatsAppClient({ conversations }: { conversations: any[] }) {
  const [selected, setSelected] = useState<string | null>(conversations[0]?.id || null);
  const [newMsg, setNewMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);

  // Per-conversation message state seeded from real DB messages
  const [messagesByConv, setMessagesByConv] = useState<Record<string, LocalMessage[]>>(() => {
    const map: Record<string, LocalMessage[]> = {};
    for (const conv of conversations) {
      map[conv.id] = conv.messages ?? [];
    }
    return map;
  });

  const filtered = conversations.filter((c) =>
    !search || c.contact.toLowerCase().includes(search.toLowerCase())
  );

  const selectedConv = conversations.find((c) => c.id === selected);
  const messages: LocalMessage[] = selected ? (messagesByConv[selected] ?? []) : [];

  async function handleSend() {
    if (!selected || !newMsg.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/whatsapp/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: selected, content: newMsg.trim() }),
      });
      if (res.ok) {
        const { message } = await res.json();
        setMessagesByConv((prev) => ({
          ...prev,
          [selected]: [...(prev[selected] ?? []), message],
        }));
        setNewMsg("");
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex h-screen animate-fade-in" style={{ maxHeight: "100vh" }}>
      {/* Sidebar */}
      <div className="w-72 flex flex-col flex-shrink-0"
        style={{ borderRight: "1px solid rgba(114,85,180,0.15)", background: "var(--color-surface-glass)" }}>
        <div className="p-4 flex-shrink-0" style={{ borderBottom: "1px solid rgba(114,85,180,0.12)" }}>
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={16} style={{ color: "var(--color-success)" }} />
            <h2 className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>WhatsApp</h2>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar conversaciones..."
              className="w-full pl-8 pr-3 py-2 rounded-lg text-xs outline-none"
              style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.2)", color: "var(--color-text-primary)" }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Sin conversaciones</p>
            </div>
          ) : (
            filtered.map((conv) => {
              const convMessages = messagesByConv[conv.id] ?? [];
              const lastMsg = convMessages[convMessages.length - 1] ?? conv.messages?.[0];
              return (
                <button
                  key={conv.id}
                  onClick={() => setSelected(conv.id)}
                  className="w-full text-left px-4 py-3 transition-all"
                  style={{
                    background: selected === conv.id ? "rgba(43,9,111,0.3)" : "transparent",
                    borderBottom: "1px solid rgba(114,85,180,0.08)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))" }}>
                      <span className="text-xs font-bold text-white">
                        {conv.contact.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "var(--color-text-primary)" }}>{conv.contact}</p>
                      {lastMsg && (
                        <p className="text-xs truncate mt-0.5" style={{ color: "var(--color-text-muted)" }}>{lastMsg.content}</p>
                      )}
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      conv.status === "open" ? "text-green-400" : "text-gray-400"
                    }`}
                      style={{ background: conv.status === "open" ? "rgba(34,197,94,0.15)" : "rgba(90,85,117,0.15)" }}>
                      {conv.status === "open" ? "ABIERTA" : "CERRADA"}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Chat header */}
            <div className="px-5 py-3.5 flex-shrink-0 flex items-center justify-between"
              style={{ borderBottom: "1px solid rgba(114,85,180,0.15)", background: "var(--color-surface-glass)" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))" }}>
                  <span className="text-xs font-bold text-white">
                    {selectedConv.contact.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{selectedConv.contact}</p>
                  {selectedConv.phone && (
                    <p className="text-xs flex items-center gap-1" style={{ color: "var(--color-text-muted)" }}>
                      <Phone size={10} /> {selectedConv.phone}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {selectedConv.tags?.split(",").filter(Boolean).map((tag: string) => (
                  <span key={tag} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1"
                    style={{ background: "rgba(114,85,180,0.15)", color: "var(--color-lavender)" }}>
                    <Tag size={9} />
                    {tag.trim()}
                  </span>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Sin mensajes aún</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.direction === "outbound" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className="max-w-xs px-4 py-2.5 text-sm"
                      style={{
                        background: msg.direction === "outbound"
                          ? "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))"
                          : "rgba(26,26,46,0.9)",
                        border: msg.direction === "inbound" ? "1px solid rgba(114,85,180,0.2)" : "none",
                        borderRadius: msg.direction === "outbound" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {msg.content}
                    </div>
                    <span className="text-[10px] mt-0.5 px-1" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(msg.createdAt).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Input */}
            <div className="p-4 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(114,85,180,0.15)", background: "var(--color-surface-glass)" }}>
              <div className="flex gap-2">
                <input
                  value={newMsg}
                  onChange={(e) => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.25)", color: "var(--color-text-primary)" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMsg.trim() || sending}
                  className="px-4 py-2.5 rounded-xl transition-all"
                  style={{
                    background: newMsg.trim() && !sending ? "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))" : "rgba(114,85,180,0.2)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare size={32} className="mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Selecciona una conversación</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
