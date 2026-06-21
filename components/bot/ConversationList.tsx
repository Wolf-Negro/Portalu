"use client";

import { useEffect, useState, useCallback } from "react";
import { useWebSocket, type WsEvent } from "@/hooks/useWebSocket";
import { useSSE }                      from "@/hooks/useSSE";

type ConvMode = "AI" | "HUMAN" | "DERIVED";
type ConvTag  = "REGISTRO" | "PRECALIFICADO" | "ATENCION_COMERCIAL" | "PAGO_DIAGNOSTICO" | "NO_CALIFICA";
type TabId    = "active" | "derived" | "no_califica" | "pago_completado";

interface Conversation {
  id:              string;
  phone:           string;
  remote_jid:      string;
  name:            string | null;
  mode:            ConvMode;
  tags:            ConvTag[];
  last_message_at: string;
  metadata:        { pushName?: string };
}

interface ConversationListProps {
  onSelect:   (id: string) => void;
  selectedId: string | null;
}

const BADGE: Record<ConvMode, string> = {
  AI:      "bg-emerald-100 text-emerald-700",
  HUMAN:   "bg-amber-100   text-amber-700",
  DERIVED: "bg-purple-100  text-purple-700",
};

const TAG_STYLE: Record<ConvTag, string> = {
  REGISTRO:           "bg-sky-50     text-sky-600",
  PRECALIFICADO:      "bg-amber-50   text-amber-700",
  ATENCION_COMERCIAL: "bg-purple-50  text-purple-700",
  PAGO_DIAGNOSTICO:   "bg-emerald-50 text-emerald-800",
  NO_CALIFICA:        "bg-gray-100   text-gray-400",
};

function parseUTC(iso: string): Date {
  return new Date(iso.includes("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z");
}

function formatTime(iso: string): string {
  return parseUTC(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ConvItem({
  conv, selectedId, onSelect, muted = false,
}: {
  conv:       Conversation;
  selectedId: string | null;
  onSelect:   (id: string) => void;
  muted?:     boolean;
}) {
  const displayName =
    conv.metadata?.pushName ?? conv.name ?? conv.remote_jid?.split("@")[0] ?? conv.phone;
  const initial    = (displayName[0] ?? "?").toUpperCase();
  const isSelected = selectedId === conv.id;

  return (
    <div
      onClick={() => onSelect(conv.id)}
      className={[
        "flex items-center gap-3 px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors border-l-4",
        muted ? "opacity-50" : "",
        isSelected
          ? "bg-[#f0ecf9] border-l-[var(--color-lavender)]"
          : "border-l-transparent hover:bg-gray-50",
      ].join(" ")}
    >
      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 select-none">
        {initial}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-900 truncate leading-tight">
            {displayName}
          </span>
          <span className="text-[10px] text-gray-400 shrink-0">
            {formatTime(conv.last_message_at)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <span className="text-xs text-gray-400 truncate">{conv.phone}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase shrink-0 ${BADGE[conv.mode] ?? BADGE.AI}`}>
            {conv.mode}
          </span>
        </div>

        {conv.tags && conv.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {conv.tags.map((tag) => (
              <span
                key={tag}
                className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${TAG_STYLE[tag] ?? "bg-gray-100 text-gray-400"}`}
              >
                {tag.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TabConfig {
  id:           TabId;
  label:        string;
  accent:       string;
  pillActive:   string;
  pillInactive: string;
}

const TAB_CONFIGS: TabConfig[] = [
  {
    id:           "active",
    label:        "En Seguimiento",
    accent:       "text-[var(--color-lavender)] border-[var(--color-lavender)]",
    pillActive:   "bg-[#f0ecf9] text-[var(--color-lavender)]",
    pillInactive: "bg-gray-100 text-gray-500",
  },
  {
    id:           "derived",
    label:        "Derivados",
    accent:       "text-purple-700 border-purple-500",
    pillActive:   "bg-purple-100 text-purple-700",
    pillInactive: "bg-purple-50 text-purple-400",
  },
  {
    id:           "no_califica",
    label:        "No Califican",
    accent:       "text-gray-600 border-gray-400",
    pillActive:   "bg-gray-200 text-gray-600",
    pillInactive: "bg-gray-100 text-gray-400",
  },
  {
    id:           "pago_completado",
    label:        "Con Pago",
    accent:       "text-emerald-700 border-emerald-500",
    pillActive:   "bg-emerald-100 text-emerald-700",
    pillInactive: "bg-emerald-50 text-emerald-400",
  },
];

const EMPTY_MSG: Record<TabId, string> = {
  active:          "Sin chats en seguimiento.",
  derived:         "No hay leads derivados aún.",
  no_califica:     "Sin leads descalificados.",
  pago_completado: "Sin pagos confirmados aún.",
};

export default function ConversationList({ onSelect, selectedId }: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [tab,           setTab]           = useState<TabId>("active");
  const [query,         setQuery]         = useState("");

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("fetch failed");
      setConversations(await res.json());
    } catch (err) {
      console.error("[ConversationList] Error fetching:", err);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const RELEVANT_WS = ["message:new", "message:sent", "chat:updated", "conversation:new"];
  const { connected } = useWebSocket(
    useCallback((e: WsEvent) => {
      if (RELEVANT_WS.includes(e.type)) loadConversations();
    }, [loadConversations])  // eslint-disable-line react-hooks/exhaustive-deps
  );

  useSSE(
    useCallback((e: WsEvent) => {
      if (RELEVANT_WS.includes(e.type)) loadConversations();
    }, [loadConversations])  // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (connected) return;
    const id = setInterval(loadConversations, 2_000);
    return () => clearInterval(id);
  }, [connected, loadConversations]);

  const isPagoCompletado = (c: Conversation) => c.tags.includes("PAGO_DIAGNOSTICO");
  const isNoCalifica     = (c: Conversation) => c.tags.includes("NO_CALIFICA");

  const isDerivada = (c: Conversation) =>
    !isPagoCompletado(c) &&
    (c.mode === "DERIVED" || c.tags.includes("ATENCION_COMERCIAL"));

  const listPago      = conversations.filter(isPagoCompletado);
  const listNoCalifica = conversations.filter(isNoCalifica);
  const listDerived   = conversations.filter(
    (c) => !isPagoCompletado(c) && !isNoCalifica(c) && isDerivada(c)
  );
  const listActive    = conversations.filter(
    (c) => !isPagoCompletado(c) && !isNoCalifica(c) && !isDerivada(c) &&
           (c.mode === "AI" || c.mode === "HUMAN")
  );

  const counts: Record<TabId, number> = {
    active:          listActive.length,
    derived:         listDerived.length,
    no_califica:     listNoCalifica.length,
    pago_completado: listPago.length,
  };

  const applySearch = (list: Conversation[]) => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) => {
      const name  = (c.metadata?.pushName ?? c.name ?? "").toLowerCase();
      const phone = c.phone.toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  };

  const visible: Record<TabId, Conversation[]> = {
    active:          applySearch(listActive),
    derived:         applySearch(listDerived),
    no_califica:     applySearch(listNoCalifica),
    pago_completado: applySearch(listPago),
  };

  return (
    <div className="flex flex-col h-full">

      <div className="shrink-0 grid grid-cols-4 bg-white border-b border-gray-200">
        {TAB_CONFIGS.map((cfg) => {
          const isActive = tab === cfg.id;
          const count    = counts[cfg.id];
          return (
            <button
              key={cfg.id}
              onClick={() => setTab(cfg.id)}
              className={[
                "flex flex-col items-center justify-center gap-0.5 px-2 py-2.5 text-[10px] font-semibold transition-colors border-b-2",
                isActive ? cfg.accent : "text-gray-400 border-transparent hover:text-gray-600",
              ].join(" ")}
            >
              <span className="truncate w-full text-center leading-tight">{cfg.label}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? cfg.pillActive : cfg.pillInactive}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="shrink-0 px-3 py-2 bg-white border-b border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-[var(--color-lavender)] focus-within:ring-1 focus-within:ring-[var(--color-lavender)]/20 transition">
          <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar contacto..."
            className="flex-1 bg-transparent text-xs text-gray-700 placeholder-gray-400 outline-none min-w-0"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="shrink-0 text-gray-400 hover:text-gray-600 transition"
              aria-label="Limpiar búsqueda"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {visible[tab].length === 0 ? (
          <p className="text-gray-400 text-xs text-center py-10 px-4">
            {query.trim()
              ? `Sin resultados para "${query.trim()}"`
              : EMPTY_MSG[tab]}
          </p>
        ) : (
          visible[tab].map((conv) => (
            <ConvItem
              key={conv.id}
              conv={conv}
              selectedId={selectedId}
              onSelect={onSelect}
              muted={tab === "no_califica"}
            />
          ))
        )}
      </div>

    </div>
  );
}
