"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, AlertTriangle, CheckCircle, AlertCircle, Calendar, TrendingUp, Bot } from "lucide-react";

type Tab = "chat" | "radar" | "resumenes" | "timeline";

const SEVERITY_CONFIG = {
  alta: { label: "Alta", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: AlertTriangle },
  media: { label: "Media", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: AlertCircle },
  baja: { label: "Baja", color: "#22c55e", bg: "rgba(34,197,94,0.12)", icon: CheckCircle },
};

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date | string;
}

function ChatTab({ chatHistory, userId }: { chatHistory: ChatMessage[]; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(chatHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/alu-ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.content, userId }),
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);
                const text = parsed.choices?.[0]?.delta?.content || "";
                fullContent += text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: fullContent } : m
                  )
                );
              } catch {}
            }
          }
        }
      }
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: "Error al conectar con ALU.IA. Verifica tu API key." }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="mb-4 p-4 rounded-full"
              style={{ background: "rgba(43,9,111,0.3)", border: "1px solid rgba(114,85,180,0.3)" }}>
              <Sparkles size={24} style={{ color: "#7255b4" }} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: "#e9e8e6" }}>
              Hola, soy ALU.IA
            </h3>
            <p className="text-sm max-w-sm" style={{ color: "#a09bbf" }}>
              Tu asistente de inteligencia artificial para marketing, ventas y estrategia. ¿En qué puedo ayudarte hoy?
            </p>
            <div className="mt-6 grid grid-cols-1 gap-2 w-full max-w-sm">
              {[
                "¿Cómo están mis campañas esta semana?",
                "¿Qué leads debo priorizar hoy?",
                "Dame un resumen del embudo de ventas",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="text-left text-xs px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: "rgba(43,9,111,0.2)",
                    border: "1px solid rgba(114,85,180,0.2)",
                    color: "#a09bbf",
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #2b096f, #7255b4)" }}>
                <Bot size={12} style={{ color: "#e9e8e6" }} />
              </div>
            )}
            <div
              className="max-w-[80%] px-4 py-2.5 text-sm leading-relaxed"
              style={{
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #2b096f 0%, #7255b4 100%)"
                  : "rgba(26,26,46,0.9)",
                border: msg.role === "assistant" ? "1px solid rgba(114,85,180,0.2)" : "none",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                color: "#e9e8e6",
              }}
            >
              {msg.content || (loading && msg.role === "assistant" ? (
                <span className="flex items-center gap-1 py-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </span>
              ) : "")}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 flex-shrink-0" style={{ borderTop: "1px solid rgba(114,85,180,0.15)" }}>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Escribe tu pregunta a ALU.IA..."
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all"
            style={{
              background: "rgba(26,26,46,0.8)",
              border: "1px solid rgba(114,85,180,0.25)",
              color: "#e9e8e6",
            }}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-xl transition-all"
            style={{
              background: loading || !input.trim()
                ? "rgba(114,85,180,0.2)"
                : "linear-gradient(135deg, #2b096f, #7255b4)",
              color: "#e9e8e6",
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function RadarTab({ alerts }: { alerts: any[] }) {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2 mb-4">
        {["all", "alta", "media", "baja"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === s
                ? s === "alta" ? "rgba(239,68,68,0.2)"
                  : s === "media" ? "rgba(245,158,11,0.2)"
                  : s === "baja" ? "rgba(34,197,94,0.2)"
                  : "rgba(114,85,180,0.3)"
                : "rgba(22,22,42,0.8)",
              border: `1px solid ${filter === s ? "rgba(114,85,180,0.4)" : "rgba(114,85,180,0.2)"}`,
              color: filter === s ? "#e9e8e6" : "#a09bbf",
            }}
          >
            {s === "all" ? "Todas" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle size={32} className="mx-auto mb-3" style={{ color: "#22c55e" }} />
          <p className="text-sm" style={{ color: "#a09bbf" }}>Sin alertas activas</p>
        </div>
      ) : (
        filtered.map((alert: any) => {
          const cfg = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.media;
          const Icon = cfg.icon;
          return (
            <div
              key={alert.id}
              className="flex gap-3 p-4 rounded-xl transition-all"
              style={{ background: cfg.bg, border: `1px solid ${cfg.color}30` }}
            >
              <Icon size={16} className="flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <span className="text-xs" style={{ color: "#5a5575" }}>
                    {new Date(alert.createdAt).toLocaleDateString("es-PE")}
                  </span>
                  {!alert.read && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: cfg.color, color: "#fff" }}>
                      NUEVA
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium mb-0.5" style={{ color: "#e9e8e6" }}>{alert.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#a09bbf" }}>{alert.description}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function ResumenesTab({ weeklySummaries }: { weeklySummaries: any[] }) {
  return (
    <div className="p-4 space-y-4">
      {weeklySummaries.length === 0 ? (
        <div className="text-center py-12">
          <Calendar size={32} className="mx-auto mb-3" style={{ color: "#7255b4" }} />
          <p className="text-sm" style={{ color: "#a09bbf" }}>Sin resúmenes generados aún</p>
          <p className="text-xs mt-1" style={{ color: "#5a5575" }}>Los resúmenes se generan automáticamente cada lunes</p>
        </div>
      ) : (
        weeklySummaries.map((summary: any) => (
          <div
            key={summary.id}
            className="rounded-xl p-5"
            style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} style={{ color: "#7255b4" }} />
                <span className="text-sm font-semibold" style={{ color: "#e9e8e6" }}>
                  Semana del {new Date(summary.weekStart).toLocaleDateString("es-PE")}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Leads", value: summary.totalLeads },
                { label: "Oportunidades", value: summary.totalOpportunities },
                { label: "Ingresos", value: `S/ ${summary.totalRevenue.toLocaleString()}` },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-3 rounded-lg"
                  style={{ background: "rgba(43,9,111,0.2)", border: "1px solid rgba(114,85,180,0.15)" }}>
                  <p className="text-lg font-bold" style={{ color: "#7255b4" }}>{stat.value}</p>
                  <p className="text-xs" style={{ color: "#a09bbf" }}>{stat.label}</p>
                </div>
              ))}
            </div>
            {summary.bestCampaign && (
              <div className="mb-3 p-3 rounded-lg"
                style={{ background: "rgba(250,117,83,0.1)", border: "1px solid rgba(250,117,83,0.2)" }}>
                <p className="text-xs font-medium" style={{ color: "#fa7553" }}>
                  Mejor campaña: {summary.bestCampaign}
                </p>
              </div>
            )}
            {summary.aiRecommendation && (
              <div className="p-3 rounded-lg flex gap-2"
                style={{ background: "rgba(114,85,180,0.1)", border: "1px solid rgba(114,85,180,0.2)" }}>
                <Sparkles size={14} className="flex-shrink-0 mt-0.5" style={{ color: "#7255b4" }} />
                <p className="text-xs leading-relaxed" style={{ color: "#a09bbf" }}>
                  {summary.aiRecommendation}
                </p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

function TimelineTab() {
  const milestones = [
    { date: "Ene 2025", label: "Primera campaña lanzada", type: "campaign", icon: TrendingUp },
    { date: "Feb 2025", label: "Primer lead registrado", type: "lead", icon: Sparkles },
    { date: "Mar 2025", label: "Primera venta cerrada", type: "sale", icon: CheckCircle },
    { date: "Abr 2025", label: "Récord de leads: 45 en una semana", type: "record", icon: AlertCircle },
  ];
  return (
    <div className="p-4">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px"
          style={{ background: "linear-gradient(180deg, #7255b4, transparent)" }} />
        <div className="space-y-6">
          {milestones.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="flex gap-4 items-start pl-8 relative">
                <div className="absolute left-0 top-0 w-8 h-8 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full"
                    style={{ background: "linear-gradient(135deg, #2b096f, #7255b4)", boxShadow: "0 0 8px rgba(114,85,180,0.5)" }} />
                </div>
                <div className="flex-1 rounded-xl p-4"
                  style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} style={{ color: "#7255b4" }} />
                    <span className="text-xs" style={{ color: "#5a5575" }}>{m.date}</span>
                  </div>
                  <p className="text-sm" style={{ color: "#e9e8e6" }}>{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface Props {
  alerts: any[];
  weeklySummaries: any[];
  chatHistory: ChatMessage[];
  userId: string;
  companyId: string;
}

export default function AluIAClient({ alerts, weeklySummaries, chatHistory, userId }: Props) {
  const [tab, setTab] = useState<Tab>("chat");
  const unreadAlerts = alerts.filter((a) => !a.read).length;

  const tabs = [
    { id: "chat" as Tab, label: "Chat IA", icon: Sparkles },
    { id: "radar" as Tab, label: "Radar", icon: AlertTriangle, badge: unreadAlerts },
    { id: "resumenes" as Tab, label: "Resúmenes", icon: Calendar },
    { id: "timeline" as Tab, label: "Timeline", icon: TrendingUp },
  ];

  return (
    <div className="flex flex-col h-screen animate-fade-in">
      {/* Header */}
      <div className="px-6 pt-6 pb-0 flex-shrink-0">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl"
            style={{ background: "linear-gradient(135deg, #2b096f, #7255b4)", boxShadow: "0 4px 16px rgba(43,9,111,0.4)" }}>
            <Sparkles size={16} style={{ color: "#e9e8e6" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "#e9e8e6" }}>ALU.IA</h1>
            <p className="text-xs" style={{ color: "#a09bbf" }}>Inteligencia artificial para tu negocio</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1" style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all relative"
                style={{
                  color: isActive ? "#e9e8e6" : "#a09bbf",
                  borderBottom: isActive ? "2px solid #7255b4" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                <Icon size={13} />
                {t.label}
                {t.badge && t.badge > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                    style={{ background: "#ef4444", color: "#fff" }}>
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "chat" && <ChatTab chatHistory={chatHistory} userId={userId} />}
        {tab === "radar" && (
          <div className="h-full overflow-y-auto">
            <RadarTab alerts={alerts} />
          </div>
        )}
        {tab === "resumenes" && (
          <div className="h-full overflow-y-auto">
            <ResumenesTab weeklySummaries={weeklySummaries} />
          </div>
        )}
        {tab === "timeline" && (
          <div className="h-full overflow-y-auto">
            <TimelineTab />
          </div>
        )}
      </div>
    </div>
  );
}
