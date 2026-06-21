"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams }   from "next/navigation";
import ConnectionGate        from "@/components/bot/ConnectionGate";
import ConversationList      from "@/components/bot/ConversationList";
import ConversationPanel     from "@/components/bot/ConversationPanel";
import { useNotifications }  from "@/hooks/useNotifications";

/* ─── Barra superior: número conectado + botón desconectar ─── */
function ConnectionBar() {
  const [number,       setNumber]       = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    const poll = async () => {
      try {
        const res  = await fetch("/api/connection/status");
        const data = await res.json() as { status: string; number: string | null };
        if (data.status === "connected" && data.number) {
          // "51912345678@s.whatsapp.net" → "+51 912 345 678"
          const raw    = data.number.split(":")[0].split("@")[0];
          const digits = raw.replace(/\D/g, "");
          setNumber(`+${digits}`);
        }
      } catch { /* silencioso */ }
    };
    poll();
    const iv = setInterval(poll, 10_000);
    return () => clearInterval(iv);
  }, []);

  const handleDisconnect = useCallback(async () => {
    if (!confirm("¿Desconectar WhatsApp? Se mostrará un nuevo QR.")) return;
    setDisconnecting(true);
    try {
      await fetch("/api/connection/disconnect", { method: "POST" });
    } finally {
      setDisconnecting(false);
    }
  }, []);

  return (
    <div
      className="shrink-0 flex items-center justify-between px-4 py-2 text-xs"
      style={{
        background:   "linear-gradient(135deg, var(--color-violet-dim) 0%, #1a0547 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span style={{ color: "rgba(255,255,255,0.8)" }}>
          WhatsApp conectado{number ? `: ${number}` : ""}
        </span>
      </div>
      <button
        onClick={handleDisconnect}
        disabled={disconnecting}
        className="px-3 py-1 rounded-md text-xs font-medium transition-all disabled:opacity-50"
        style={{
          background: "rgba(239,68,68,0.18)",
          border:     "1px solid rgba(239,68,68,0.4)",
          color:      "#fca5a5",
        }}
      >
        {disconnecting ? "Desconectando…" : "Desconectar"}
      </button>
    </div>
  );
}

/* ─── Contenido principal ─── */
function WhatsAppContent() {
  const searchParams   = useSearchParams();
  const initialConv    = searchParams.get("conv");
  const [selectedConvId, setSelectedConvId] = useState<string | null>(initialConv);

  useNotifications();

  return (
    <ConnectionGate>
      <div className="flex flex-col h-full overflow-hidden">
        <ConnectionBar />
        <div className="flex flex-1 overflow-hidden">
          <aside className="w-1/3 min-w-[300px] bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            <ConversationList onSelect={setSelectedConvId} selectedId={selectedConvId} />
          </aside>
          <main className="flex-1 flex flex-col bg-[#efeae2] overflow-hidden">
            <ConversationPanel conversationId={selectedConvId} />
          </main>
        </div>
      </div>
    </ConnectionGate>
  );
}

export default function WhatsAppPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Cargando…
      </div>
    }>
      <WhatsAppContent />
    </Suspense>
  );
}
