"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import MessageBubble from "./MessageBubble";
import { useWebSocket, type WsEvent } from "@/hooks/useWebSocket";
import { useSSE }                      from "@/hooks/useSSE";
import { useToast }                    from "@/components/ui/toast";

interface ConversationPanelProps {
  conversationId: string | null;
}

const CFG_DEFAULTS = {
  valor_conversion: 380,
  moneda:           "PEN",
  col1_name:        null as string | null,
  col2_name:        null as string | null,
  col3_name:        null as string | null,
  col4_name:        null as string | null,
  nombre_asesor:    null as string | null,
};

const STAGE_MAP = [
  { tag: "REGISTRO",           key: "col1_name" as const, default: "Registro"           },
  { tag: "PRECALIFICADO",      key: "col2_name" as const, default: "Precalificado"      },
  { tag: "ATENCION_COMERCIAL", key: "col3_name" as const, default: "Atención Comercial" },
  { tag: "PAGO_DIAGNOSTICO",   key: "col4_name" as const, default: "Pago Diagnóstico"   },
] as const;

type StageTag = typeof STAGE_MAP[number]["tag"];

export default function ConversationPanel({ conversationId }: ConversationPanelProps) {
  const { showToast } = useToast();
  const [messages,          setMessages]          = useState<any[]>([]);
  const [inputText,         setInputText]         = useState("");
  const [mode,              setMode]              = useState<"AI" | "HUMAN" | "DERIVED">("AI");
  const [tags,              setTags]              = useState<string[]>([]);
  const [closingDeal,       setClosingDeal]       = useState(false);
  const [movingStage,       setMovingStage]       = useState(false);
  const [cfg,               setCfg]               = useState(CFG_DEFAULTS);
  const [aiSummary,         setAiSummary]         = useState<string | null>(null);
  const [leadScoring,       setLeadScoring]       = useState<number>(0);
  const [briefingOpen,      setBriefingOpen]      = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp,   setIsScrolledUp]        = useState(false);

  const [recording,      setRecording]      = useState(false);
  const [recordingTime,  setRecordingTime]  = useState(0);
  const [audioBlob,      setAudioBlob]      = useState<Blob | null>(null);
  const [audioMime,      setAudioMime]      = useState("audio/webm");
  const [sendingAudio,   setSendingAudio]   = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recTimerRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      setIsScrolledUp(scrollHeight - scrollTop - clientHeight > 100);
    }
  };

  useEffect(() => {
    if (!isScrolledUp && chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isScrolledUp]);

  const fetchMessages = async () => {
    if (!conversationId) return;
    const cleanId = String(conversationId).split("@")[0];
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(cleanId)}`);
      if (!res.ok) throw new Error("Error en API");
      const data = await res.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const fetchMode = async () => {
    if (!conversationId) return;
    try {
      const res   = await fetch("/api/conversations");
      const convs = await res.json();
      const cleanId = String(conversationId).split("@")[0];
      const current = convs.find((c: any) => String(c.id) === cleanId || c.phone === cleanId);
      if (current) {
        const newMode = current.mode || "AI";
        setMode(newMode);
        setTags(current.tags || []);
        setAiSummary(current.ai_summary ?? null);
        setLeadScoring(current.lead_scoring ?? 0);
        if (newMode === "HUMAN" || newMode === "DERIVED") setBriefingOpen(true);
      }
    } catch (err) {
      console.error("Error fetching mode:", err);
    }
  };

  useEffect(() => {
    fetch("/api/app-config")
      .then((r) => r.json())
      .then((d) => setCfg({ ...CFG_DEFAULTS, ...d }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!conversationId) { setMessages([]); return; }
    fetchMessages();
    fetchMode();
  }, [conversationId]);

  const { connected } = useWebSocket(
    useCallback((e: WsEvent) => {
      if (!conversationId) return;
      const payload  = e.payload as { conversationId?: unknown };
      const evConvId = String(payload.conversationId ?? "");
      const localId  = String(conversationId).split("@")[0];

      if (
        e.type === "message:new" &&
        (evConvId === localId || evConvId === conversationId)
      ) {
        fetchMessages();
      }
      if (e.type === "chat:updated") {
        fetchMode();
      }
    }, [conversationId])  // eslint-disable-line react-hooks/exhaustive-deps
  );

  useSSE((e: WsEvent) => {
    if (!conversationId) return;
    const payload  = e.payload as { conversationId?: unknown };
    const evConvId = String(payload.conversationId ?? "");
    const localId  = String(conversationId).split("@")[0];
    if (e.type === "message:new" && (evConvId === localId || evConvId === conversationId)) {
      fetchMessages();
    }
    if (e.type === "chat:updated") fetchMode();
  });

  useEffect(() => {
    if (connected || !conversationId) return;
    const id = setInterval(() => { fetchMessages(); fetchMode(); }, 2_000);
    return () => clearInterval(id);
  }, [connected, conversationId]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !conversationId) return;

    const textToSend = inputText.trim();
    setInputText("");

    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(conversationId)}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ content: textToSend }),
      });
      if (res.ok) {
        fetchMessages();
      } else {
        setInputText(textToSend);
        showToast("No se pudo enviar el mensaje. Intenta de nuevo.", "error");
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setInputText(textToSend);
      showToast("No se pudo enviar el mensaje. Intenta de nuevo.", "error");
    }
  };

  const markPagoDiagnostico = async () => {
    if (!conversationId || closingDeal) return;
    const col4  = cfg.col4_name?.trim() || "Pago Diagnóstico";
    const valor = `${cfg.moneda || "PEN"} ${cfg.valor_conversion ?? 380}`;
    if (!confirm(`¿Confirmar "${col4}" (${valor})? Se enviará un evento Purchase a Meta CAPI.`)) return;
    setClosingDeal(true);
    try {
      await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/tags`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ add: "PAGO_DIAGNOSTICO" }),
      });
      await fetchMode();
    } catch (err) {
      console.error("Error marcando pago de diagnóstico:", err);
    } finally {
      setClosingDeal(false);
    }
  };

  const moveToStage = async (stage: StageTag) => {
    if (!conversationId || movingStage) return;
    setMovingStage(true);
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/stage`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ stage }),
        }
      );
      if (res.ok) {
        const data = await res.json() as { tags?: string[] };
        if (data.tags) setTags(data.tags);
        window.dispatchEvent(new CustomEvent("pipeline-stage-updated", {
          detail: { conversationId, stage },
        }));
      }
    } catch (err) {
      console.error("Error moviendo etapa:", err);
    } finally {
      setMovingStage(false);
    }
  };

  const toggleMode = async () => {
    if (!conversationId) return;
    const newMode = mode === "AI" ? "HUMAN" : "AI";
    try {
      const res = await fetch(`/api/mode/${encodeURIComponent(conversationId)}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ mode: newMode }),
      });
      if (res.ok) {
        setMode(newMode);
        fetchMessages();
      }
    } catch (err) {
      console.error("Error toggling mode:", err);
    }
  };

  const deleteConversation = async () => {
    if (!conversationId || !confirm("¿Borrar toda la conversación?")) return;
    try {
      await fetch(`/api/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE" });
      window.location.reload();
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  const generateSummary = async () => {
    if (!conversationId || generatingSummary) return;
    setGeneratingSummary(true);
    try {
      const res = await fetch(
        `/api/conversations/${encodeURIComponent(conversationId)}/summary`,
        { method: "POST" }
      );
      if (res.ok) {
        const data = await res.json();
        setAiSummary(data.summary);
      }
    } catch (err) {
      console.error("Error generando resumen:", err);
    } finally {
      setGeneratingSummary(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")  ? "audio/ogg;codecs=opus"  :
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" :
        "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioMime(mimeType);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingTime(0);
      recTimerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      alert("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    setRecording(false);
  };

  const cancelAudio = () => { setAudioBlob(null); setRecordingTime(0); };

  const sendAudio = async () => {
    if (!audioBlob || !conversationId || sendingAudio) return;
    setSendingAudio(true);
    try {
      const cleanId = String(conversationId).split("@")[0];
      const res = await fetch(`/api/audio-send?conv=${encodeURIComponent(cleanId)}`, {
        method:  "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Audio-Mime": audioMime,
        },
        body: audioBlob,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(`Error enviando audio: ${(err as any).error || res.status}`, "error");
        return;
      }
      setAudioBlob(null);
      setRecordingTime(0);
    } catch (err) {
      console.error("[audio] Error enviando audio:", err);
      showToast("Error de red al enviar el audio.", "error");
    } finally {
      setSendingAudio(false);
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const briefingCarita = () => {
    if (tags.includes("PAGO_DIAGNOSTICO"))   return { icon: "💰", label: "¡Venta!",  color: "#10B981" };
    if (tags.includes("ATENCION_COMERCIAL")) return { icon: "⭐", label: "¡Listo!",  color: "#F97316" };
    if (tags.includes("NO_CALIFICA"))        return { icon: "😞", label: "Triste",   color: "#EF4444" };
    if (tags.includes("REGISTRO"))           return { icon: "💬", label: "Nuevo",    color: "#EF4444" };
    if (leadScoring >= 70)                   return { icon: "😊", label: "Feliz",    color: "#10B981" };
    return                                          { icon: "😐", label: "Seria",    color: "#EAB308" };
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#efeae2] text-gray-500 font-medium">
        Selecciona un chat para ver los mensajes
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-300 bg-gray-50 px-4 py-2 flex items-center justify-between shrink-0 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleMode}
            disabled={mode === "DERIVED"}
            title={mode === "DERIVED" ? "Chat derivado — usa el panel de Ingrid" : undefined}
            className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === "AI"
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : mode === "DERIVED"
                ? "bg-purple-600 text-white"
                : "bg-amber-500 text-white hover:bg-amber-600"
            }`}
          >
            MODO: {mode}
          </button>

          {tags.map((tag) => (
            <span
              key={tag}
              className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#f0ecf9] text-[var(--color-lavender)] uppercase"
            >
              {tag.replace(/_/g, " ")}
            </span>
          ))}
        </div>

        {mode === "HUMAN" && (
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wide mr-0.5 shrink-0">
              Mover a:
            </span>
            {STAGE_MAP.map(({ tag, key, default: def }) => {
              const label     = cfg[key]?.trim() || def;
              const isCurrent = tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() => !isCurrent && moveToStage(tag)}
                  disabled={movingStage || isCurrent}
                  title={isCurrent ? `Etapa actual: ${label}` : `Mover a ${label}`}
                  className={[
                    "text-[9px] font-bold px-2 py-0.5 rounded-full border transition shrink-0",
                    isCurrent
                      ? "bg-indigo-600 text-white border-indigo-600 cursor-default"
                      : "bg-white text-gray-500 border-gray-200 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40",
                  ].join(" ")}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-2">
          {tags.includes("ATENCION_COMERCIAL") && !tags.includes("PAGO_DIAGNOSTICO") && (
            <button
              onClick={markPagoDiagnostico}
              disabled={closingDeal}
              className="px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition shadow-sm disabled:opacity-50"
            >
              {closingDeal ? "Registrando…" : `💳 ${cfg.col4_name?.trim() || "Pago Diagnóstico"}`}
            </button>
          )}

          {tags.includes("PAGO_DIAGNOSTICO") && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
              ✅ {cfg.col4_name?.trim() || "Pago Diagnóstico"} Confirmado
            </span>
          )}

          <button
            onClick={deleteConversation}
            className="text-gray-400 hover:text-red-500 transition p-1.5"
            title="Borrar chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Briefing Card */}
      {(() => {
        const carita = briefingCarita();
        const stageLabel = (() => {
          if (tags.includes("PAGO_DIAGNOSTICO"))   return cfg.col4_name?.trim() || "Pago Diagnóstico";
          if (tags.includes("ATENCION_COMERCIAL")) return cfg.col3_name?.trim() || "Atención Comercial";
          if (tags.includes("PRECALIFICADO"))      return cfg.col2_name?.trim() || "Precalificado";
          if (tags.includes("REGISTRO"))           return cfg.col1_name?.trim() || "Registro";
          if (tags.includes("NO_CALIFICA"))        return "No Califica";
          return null;
        })();
        return (
          <div className="shrink-0 border-b border-gray-200">
            <button
              onClick={() => setBriefingOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-2 bg-white hover:bg-gray-50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{carita.icon}</span>
                <span style={{ color: carita.color }} className="text-[10px] font-bold">{carita.label}</span>
                {stageLabel && (
                  <>
                    <span className="text-gray-300 text-xs">·</span>
                    <span className="text-[10px] font-semibold text-[var(--color-lavender)] bg-[#f0ecf9] px-2 py-0.5 rounded-full uppercase">
                      {stageLabel}
                    </span>
                  </>
                )}
                <span className="text-[10px] text-gray-400 ml-1">Briefing del lead</span>
              </div>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${briefingOpen ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {briefingOpen && (
              <div className="px-4 pb-3 pt-1 bg-white space-y-2">
                {aiSummary ? (
                  <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                    {aiSummary}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Sin resumen todavía.</p>
                )}
                <button
                  onClick={generateSummary}
                  disabled={generatingSummary}
                  className="flex items-center gap-1.5 text-[10px] font-semibold text-[var(--color-lavender)] hover:text-[#5e449a] transition disabled:opacity-50"
                >
                  <svg className={`w-3 h-3 ${generatingSummary ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {generatingSummary ? "Generando…" : aiSummary ? "Regenerar resumen" : "Generar resumen con IA"}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Messages */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto py-4 bg-[#efeae2] space-y-1"
      >
        {messages?.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-50 border-t border-gray-300 shrink-0">
        {mode === "AI" ? (
          <div className="bg-white p-3 rounded-lg text-center text-sm text-gray-500 border border-gray-200 italic shadow-sm">
            El bot responde automáticamente. Cambia a modo Humano para escribir.
          </div>
        ) : audioBlob ? (
          <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-4 py-2 shadow-sm">
            <span className="text-lg">🎵</span>
            <span className="text-sm font-semibold text-gray-600 flex-1">Nota de voz · {fmtTime(recordingTime)}</span>
            <button onClick={cancelAudio} className="text-gray-400 hover:text-red-500 transition p-1" title="Cancelar">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
            <button
              onClick={sendAudio}
              disabled={sendingAudio}
              className="text-white px-4 py-1.5 rounded-full text-xs font-bold transition disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--color-lavender) 0%, var(--color-violet-dim) 100%)" }}
            >
              {sendingAudio ? "Enviando…" : "Enviar"}
            </button>
          </div>
        ) : recording ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-full px-4 py-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="text-sm font-semibold text-red-600 flex-1">Grabando… {fmtTime(recordingTime)}</span>
            <button
              onClick={stopRecording}
              className="bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-red-600 transition"
            >
              Detener
            </button>
          </div>
        ) : (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <button
              type="button"
              onClick={startRecording}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-[var(--color-lavender)] hover:bg-[#f0ecf9] transition shrink-0"
              title="Grabar nota de voz"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <rect x="9" y="2" width="6" height="11" rx="3"/>
                <path d="M19 10a7 7 0 0 1-14 0M12 19v3M8 22h8"/>
              </svg>
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 border border-gray-200 rounded-full px-5 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-lavender)]/20 focus:border-[var(--color-lavender)] bg-white transition"
            />
            <button
              type="submit"
              className="text-white p-2 rounded-full transition shadow-md w-10 h-10 flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg, var(--color-lavender) 0%, var(--color-violet-dim) 100%)" }}
            >
              <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
