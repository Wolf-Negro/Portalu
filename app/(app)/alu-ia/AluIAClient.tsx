"use client";

import { useState, useRef, useEffect } from "react";
import { Send, AlertTriangle, CheckCircle, AlertCircle, Calendar, TrendingUp, Sparkles } from "lucide-react";

type Tab = "chat" | "radar" | "resumenes" | "timeline";
type AluMode = "idle" | "thinking" | "responding";

const SEVERITY_CONFIG = {
  alta:  { label: "Alta",  color: "var(--color-danger)",  bg: "rgba(239,68,68,0.12)",  icon: AlertTriangle },
  media: { label: "Media", color: "var(--color-warning)", bg: "rgba(245,158,11,0.12)", icon: AlertCircle  },
  baja:  { label: "Baja",  color: "var(--color-success)", bg: "rgba(34,197,94,0.12)",  icon: CheckCircle  },
};

const QUICK_QUESTIONS = [
  "¿Cómo están mis campañas esta semana?",
  "¿Qué leads debo priorizar hoy?",
  "Dame un análisis del embudo de ventas",
  "¿Cómo puedo bajar mi CPL?",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date | string;
}

// ─── CSS global animations ────────────────────────────────────────────────────

const ALU_STYLES = `
  @keyframes aluFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25%       { transform: translateY(-7px) rotate(-1deg); }
    75%       { transform: translateY(-4px) rotate(1deg); }
  }
  @keyframes aluThink {
    0%,100% { transform: translateY(0) scale(1)    rotate(0deg); }
    20%     { transform: translateY(-4px) scale(1.04) rotate(-2deg); }
    50%     { transform: translateY(-9px) scale(1.06) rotate(2deg); }
    80%     { transform: translateY(-4px) scale(1.04) rotate(-1deg); }
  }
  @keyframes aluRespond {
    0%   { transform: scale(1)    translateY(0); }
    30%  { transform: scale(1.12) translateY(-10px); }
    60%  { transform: scale(0.95) translateY(2px); }
    80%  { transform: scale(1.05) translateY(-4px); }
    100% { transform: scale(1)    translateY(0); }
  }
  @keyframes aluGlowIdle {
    0%,100% { opacity: 0.4; transform: scale(1);    }
    50%     { opacity: 0.8; transform: scale(1.15); }
  }
  @keyframes aluGlowThink {
    0%,100% { opacity: 0.7; transform: scale(1.1);  }
    50%     { opacity: 1;   transform: scale(1.35); }
  }
  @keyframes typingBounce {
    0%,80%,100% { transform: translateY(0);   opacity: 0.4; }
    40%         { transform: translateY(-6px); opacity: 1;   }
  }
  .alu-float   { animation: aluFloat   3.6s ease-in-out infinite; }
  .alu-think   { animation: aluThink   0.75s ease-in-out infinite; }
  .alu-respond { animation: aluRespond 0.55s ease-out forwards; }
  .typing-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--color-violet-soft);
    animation: typingBounce 1.1s ease-in-out infinite;
  }
`;

// ─── Alu Character ────────────────────────────────────────────────────────────
// Muestra solo el personaje del frente (tercio izquierdo de la imagen).
// Usa background-image + mask radial para eliminar el fondo blanco.

function AluCharacter({
  size     = 130,
  mode     = "idle" as AluMode,
  noAnim   = false,
}: {
  size?:   number;
  mode?:   AluMode;
  noAnim?: boolean;
}) {
  const animClass = noAnim
    ? ""
    : mode === "thinking"   ? "alu-think"
    : mode === "responding" ? "alu-respond"
    : "alu-float";

  const glowAnim = mode === "thinking" ? "aluGlowThink" : "aluGlowIdle";
  const glowOpacity = mode === "thinking" ? 1 : 0.6;

  // El personaje principal ocupa el ~33% izquierdo de la imagen (1320×880px).
  // backgroundSize: 295% → imagen mostrada = size*2.95 ≈ cubre el 1/3 izquierdo.
  // backgroundPosition: 0% 0% → empieza desde la esquina superior izquierda.
  const height = Math.round(size * 1.35);

  return (
    <div style={{ position: "relative", width: size, height, flexShrink: 0 }}>
      {/* Glow externo */}
      <div style={{
        position:    "absolute",
        inset:       -size * 0.15,
        borderRadius: "50%",
        background:  mode === "thinking"
          ? "radial-gradient(circle, rgba(114,85,180,0.55) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(114,85,180,0.28) 0%, transparent 70%)",
        filter:      `blur(${size * 0.12}px)`,
        animation:   `${glowAnim} ${mode === "thinking" ? "0.75s" : "3.6s"} ease-in-out infinite`,
        opacity:     glowOpacity,
        pointerEvents: "none",
      }} />

      {/* Personaje */}
      <div
        className={animClass}
        style={{
          width:          "100%",
          height:         "100%",
          backgroundImage:    "url(/alu-persona.jpeg)",
          backgroundSize:     "295% auto",
          backgroundPosition: "1.5% 0%",
          backgroundRepeat:   "no-repeat",
          // Máscara elíptica suave → elimina el fondo blanco en los bordes
          maskImage:          "radial-gradient(ellipse 78% 88% at 50% 38%, black 48%, transparent 78%)",
          WebkitMaskImage:    "radial-gradient(ellipse 78% 88% at 50% 38%, black 48%, transparent 78%)",
          filter: mode === "thinking"
            ? "drop-shadow(0 0 18px rgba(114,85,180,0.9)) brightness(1.08)"
            : "drop-shadow(0 0 10px rgba(114,85,180,0.5))",
          transition: "filter 0.4s ease",
          cursor: "default",
        }}
      />
    </div>
  );
}

// Avatar pequeño (mensajes + input bar)
function AluAvatar({ size = 36 }: { size?: number }) {
  return (
    <div style={{
      width:              size,
      height:             size,
      borderRadius:       "50%",
      overflow:           "hidden",
      flexShrink:         0,
      border:             "2px solid rgba(114,85,180,0.55)",
      boxShadow:          "0 0 10px rgba(114,85,180,0.3)",
      backgroundImage:    "url(/alu-persona.jpeg)",
      backgroundSize:     "295% auto",
      backgroundPosition: "2% 5%",
      backgroundRepeat:   "no-repeat",
    }} />
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <span className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.16}s` }} />
      ))}
    </span>
  );
}

// ─── Chat Tab ─────────────────────────────────────────────────────────────────

function ChatTab({ chatHistory, userId }: { chatHistory: ChatMessage[]; userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>(chatHistory);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [aluMode,  setAluMode]  = useState<AluMode>("idle");
  const bottomRef               = useRef<HTMLDivElement>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setAluMode("thinking");

    const assistantMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
      createdAt: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    try {
      const res = await fetch("/api/alu-ia/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ message: content, userId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Error al conectar con ALU.IA");
      }

      const reader  = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer      = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // stream: true conserva bytes UTF-8 incompletos (tildes/ñ) entre paquetes.
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          // La última línea puede estar incompleta (el evento SSE aún no llegó
          // completo) — se guarda en el buffer para la siguiente iteración en
          // vez de procesarla a medias.
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (line.startsWith("data: ") && line !== "data: [DONE]") {
              try {
                const token = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || "";
                fullContent += token;
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantMsg.id ? { ...m, content: fullContent } : m)
                );
              } catch {}
            }
          }
        }
      }

      // Bounce al terminar
      setAluMode("responding");
      setTimeout(() => setAluMode("idle"), 600);
    } catch (err) {
      const errorText = err instanceof Error && err.message
        ? err.message
        : "Ups, no pude conectarme ahora mismo. Intenta de nuevo.";
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsg.id ? { ...m, content: errorText } : m)
      );
      setAluMode("idle");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* ── Welcome screen ── */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-6 pb-4">

            <AluCharacter size={140} mode={aluMode} />

            <div>
              <h2 className="text-2xl font-bold mb-1.5" style={{ color: "var(--color-text-primary)" }}>
                Hola, soy <span style={{ color: "var(--color-violet-soft)" }}>Alu</span>
              </h2>
              <p className="text-sm max-w-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                Tu co-piloto de marketing. Tengo acceso a tus métricas, campañas y leads — pregúntame lo que necesites.
              </p>
            </div>

            <div className="w-full max-w-xs space-y-2">
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="w-full text-left text-sm px-4 py-2.5 rounded-2xl transition-all hover:scale-[1.015] disabled:opacity-50"
                  style={{
                    background: "rgba(43,9,111,0.22)",
                    border:     "1px solid rgba(114,85,180,0.22)",
                    color:      "var(--color-text-secondary)",
                  }}
                >
                  <span style={{ color: "var(--color-lavender)", marginRight: 8 }}>✦</span>{q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Conversation ── */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} items-end`}
          >
            {msg.role === "assistant" && <AluAvatar size={32} />}
            {msg.role === "user" && (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
                style={{ background: "rgba(114,85,180,0.3)", color: "var(--color-text-primary)", border: "1px solid rgba(114,85,180,0.4)" }}
              >
                Tú
              </div>
            )}
            <div
              className="max-w-[78%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
              style={{
                background: msg.role === "user"
                  ? "linear-gradient(135deg, var(--color-violet-dim) 0%, var(--color-lavender) 100%)"
                  : "var(--color-surface-card)",
                border:       msg.role === "assistant" ? "1px solid rgba(114,85,180,0.2)" : "none",
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
                color:        msg.role === "user" ? "#fff" : "var(--color-text-primary)",
                boxShadow:    msg.role === "user"
                  ? "0 4px 16px rgba(43,9,111,0.35)"
                  : "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              {msg.content
                ? msg.content
                : (loading && msg.role === "assistant" ? <TypingDots /> : "")}
            </div>
          </div>
        ))}

        {/* Mini Alu pensando (cuando hay mensajes y está cargando) */}
        {loading && !isEmpty && (
          <div className="flex justify-center py-2 opacity-70">
            <AluCharacter size={48} mode="thinking" />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar ── */}
      <div
        className="p-4 flex-shrink-0 flex gap-3 items-center"
        style={{ borderTop: "1px solid rgba(114,85,180,0.15)", background: "var(--color-surface-glass)", backdropFilter: "blur(8px)" }}
      >
        <AluAvatar size={32} />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Escríbele a Alu..."
          disabled={loading}
          className="flex-1 px-4 py-2.5 rounded-2xl text-sm outline-none"
          style={{
            background: "var(--color-surface-card)",
            border:     "1px solid rgba(114,85,180,0.28)",
            color:      "var(--color-text-primary)",
          }}
        />
        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-2xl transition-all"
          style={{
            background: loading || !input.trim()
              ? "rgba(114,85,180,0.15)"
              : "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))",
            color:      "var(--color-text-primary)",
            boxShadow:  (!loading && input.trim()) ? "0 4px 16px rgba(43,9,111,0.4)" : "none",
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}

// ─── Radar Tab ────────────────────────────────────────────────────────────────

function RadarTab({ alerts }: { alerts: any[] }) {
  const [filter, setFilter] = useState<string>("all");
  const filtered = filter === "all" ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2 mb-4 flex-wrap">
        {["all","alta","media","baja"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: filter === s
                ? s === "alta" ? "rgba(239,68,68,0.25)" : s === "media" ? "rgba(245,158,11,0.25)" : s === "baja" ? "rgba(34,197,94,0.25)" : "rgba(114,85,180,0.3)"
                : "var(--color-surface-glass)",
              border: `1px solid ${filter === s ? "rgba(114,85,180,0.4)" : "rgba(114,85,180,0.18)"}`,
              color: filter === s ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            }}>
            {s === "all" ? "Todas" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <CheckCircle size={28} className="mx-auto mb-3" style={{ color: "var(--color-success)" }} />
          <p className="text-sm font-medium" style={{ color: "var(--color-text-secondary)" }}>Sin alertas activas</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Alu está monitoreando tu negocio</p>
        </div>
      ) : (
        filtered.map((alert: any) => {
          const cfg  = SEVERITY_CONFIG[alert.severity as keyof typeof SEVERITY_CONFIG] || SEVERITY_CONFIG.media;
          const Icon = cfg.icon;
          return (
            <div key={alert.id} className="flex gap-3 p-4 rounded-xl"
              style={{ background: cfg.bg, border: `1px solid color-mix(in srgb, ${cfg.color} 19%, transparent)` }}>
              <Icon size={16} className="flex-shrink-0 mt-0.5" style={{ color: cfg.color }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold" style={{ color: cfg.color }}>{cfg.label}</span>
                  <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(alert.createdAt).toLocaleDateString("es-PE")}
                  </span>
                  {!alert.read && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: cfg.color, color: "#fff" }}>NUEVA</span>
                  )}
                </div>
                <p className="text-sm font-medium mb-0.5" style={{ color: "var(--color-text-primary)" }}>{alert.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{alert.description}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// ─── Resúmenes Tab ────────────────────────────────────────────────────────────

function ResumenesTab({ weeklySummaries }: { weeklySummaries: any[] }) {
  return (
    <div className="p-4 space-y-4">
      {weeklySummaries.length === 0 ? (
        <div className="text-center py-16">
          <Calendar size={32} className="mx-auto mb-3" style={{ color: "var(--color-lavender)" }} />
          <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>Sin resúmenes generados aún</p>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Se generan automáticamente cada lunes</p>
        </div>
      ) : (
        weeklySummaries.map((s: any) => (
          <div key={s.id} className="rounded-xl p-5"
            style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={14} style={{ color: "var(--color-lavender)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Semana del {new Date(s.weekStart).toLocaleDateString("es-PE")}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { label: "Leads",        value: s.totalLeads },
                { label: "Oportunidades",value: s.totalOpportunities },
                { label: "Ingresos",     value: `S/ ${s.totalRevenue?.toLocaleString()}` },
              ].map((stat) => (
                <div key={stat.label} className="text-center p-3 rounded-lg"
                  style={{ background: "rgba(43,9,111,0.2)", border: "1px solid rgba(114,85,180,0.15)" }}>
                  <p className="text-lg font-bold" style={{ color: "var(--color-lavender)" }}>{stat.value}</p>
                  <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{stat.label}</p>
                </div>
              ))}
            </div>
            {s.bestCampaign && (
              <div className="mb-3 p-3 rounded-lg"
                style={{ background: "rgba(250,117,83,0.1)", border: "1px solid rgba(250,117,83,0.2)" }}>
                <p className="text-xs font-medium" style={{ color: "var(--color-coral)" }}>Mejor campaña: {s.bestCampaign}</p>
              </div>
            )}
            {s.aiRecommendation && (
              <div className="p-3 rounded-lg flex gap-2"
                style={{ background: "rgba(114,85,180,0.1)", border: "1px solid rgba(114,85,180,0.2)" }}>
                <Sparkles size={14} className="flex-shrink-0 mt-0.5" style={{ color: "var(--color-lavender)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{s.aiRecommendation}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Timeline Tab ─────────────────────────────────────────────────────────────

function TimelineTab() {
  const milestones = [
    { date: "Ene 2025", label: "Primera campaña lanzada",           icon: TrendingUp  },
    { date: "Feb 2025", label: "Primer lead registrado",            icon: Sparkles    },
    { date: "Mar 2025", label: "Primera venta cerrada",             icon: CheckCircle },
    { date: "Abr 2025", label: "Récord de leads: 45 en una semana", icon: AlertCircle },
  ];
  return (
    <div className="p-4">
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px"
          style={{ background: "linear-gradient(180deg,var(--color-lavender),transparent)" }} />
        <div className="space-y-6">
          {milestones.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="flex gap-4 items-start pl-10 relative">
                <div className="absolute left-0 top-1 w-8 h-8 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full"
                    style={{ background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))", boxShadow: "0 0 8px rgba(114,85,180,0.5)" }} />
                </div>
                <div className="flex-1 rounded-xl p-4"
                  style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={12} style={{ color: "var(--color-lavender)" }} />
                    <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{m.date}</span>
                  </div>
                  <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>{m.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  alerts: any[];
  weeklySummaries: any[];
  chatHistory: ChatMessage[];
  userId: string;
  companyId: string;
}

export default function AluIAClient({ alerts, weeklySummaries, chatHistory, userId }: Props) {
  const [tab, setTab]   = useState<Tab>("chat");
  const unreadAlerts    = alerts.filter((a) => !a.read).length;

  const tabs = [
    { id: "chat"      as Tab, label: "Chat",      icon: Sparkles      },
    { id: "radar"     as Tab, label: "Radar",     icon: AlertTriangle, badge: unreadAlerts },
    { id: "resumenes" as Tab, label: "Resúmenes", icon: Calendar      },
    { id: "timeline"  as Tab, label: "Timeline",  icon: TrendingUp    },
  ];

  return (
    <>
      <style>{ALU_STYLES}</style>

      <div className="flex flex-col h-screen animate-fade-in">

        {/* ── Header ── */}
        <div className="px-5 pt-5 pb-0 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>

          <div className="flex items-center gap-4 mb-4">
            {/* Personaje en el header — pequeño, flotando */}
            <div style={{ width: 56, height: 70, flexShrink: 0 }}>
              <AluCharacter size={56} mode="idle" />
            </div>

            <div className="flex-1">
              <h1 className="text-lg font-bold leading-tight" style={{ color: "var(--color-text-primary)" }}>
                ALU<span style={{ color: "var(--color-violet-soft)" }}>.IA</span>
              </h1>
              <p className="text-xs flex items-center gap-1.5 mt-0.5" style={{ color: "#4ade80" }}>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block"
                  style={{ boxShadow: "0 0 5px #4ade80" }} />
                En línea · Co-piloto de marketing
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0.5">
            {tabs.map((t) => {
              const Icon     = t.icon;
              const isActive = tab === t.id;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-all relative"
                  style={{
                    color:        isActive ? "var(--color-text-primary)" : "var(--color-text-faint)",
                    borderBottom: isActive ? "2px solid var(--color-lavender)" : "2px solid transparent",
                    marginBottom: -1,
                  }}>
                  <Icon size={12} />
                  {t.label}
                  {t.badge && t.badge > 0 ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                      style={{ background: "var(--color-danger)", color: "#fff" }}>{t.badge}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-hidden">
          {tab === "chat"      && <ChatTab chatHistory={chatHistory} userId={userId} />}
          {tab === "radar"     && <div className="h-full overflow-y-auto"><RadarTab alerts={alerts} /></div>}
          {tab === "resumenes" && <div className="h-full overflow-y-auto"><ResumenesTab weeklySummaries={weeklySummaries} /></div>}
          {tab === "timeline"  && <div className="h-full overflow-y-auto"><TimelineTab /></div>}
        </div>
      </div>
    </>
  );
}
