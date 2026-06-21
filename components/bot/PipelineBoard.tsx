"use client";

import { useCallback, useEffect, useState } from "react";
import { useWebSocket, type WsEvent } from "@/hooks/useWebSocket";
import { useSSE }                      from "@/hooks/useSSE";
import type { AppConfig } from "@/lib/bot-db";

type ConvTag =
  | "REGISTRO"
  | "PRECALIFICADO"
  | "ATENCION_COMERCIAL"
  | "PAGO_DIAGNOSTICO"
  | "NO_CALIFICA";

type StageTag = Exclude<ConvTag, "NO_CALIFICA">;

interface Lead {
  id:              string;
  phone:           string;
  name:            string | null;
  mode:            string;
  tags:            ConvTag[];
  last_message_at: string;
  metadata:        { pushName?: string };
  lead_scoring:    number;
  ai_summary:      string | null;
}

interface PipelineBoardProps {
  onSelectConv: (id: string) => void;
}

const COL_STATIC = [
  { tag: "REGISTRO"           as StageTag, headerBg: "bg-red-500",     colBg: "bg-red-50",     borderColor: "border-red-200"     },
  { tag: "PRECALIFICADO"      as StageTag, headerBg: "bg-yellow-400",  colBg: "bg-yellow-50",  borderColor: "border-yellow-200"  },
  { tag: "ATENCION_COMERCIAL" as StageTag, headerBg: "bg-orange-500",  colBg: "bg-orange-50",  borderColor: "border-orange-200"  },
  { tag: "PAGO_DIAGNOSTICO"   as StageTag, headerBg: "bg-emerald-600", colBg: "bg-emerald-50", borderColor: "border-emerald-200" },
] as const;

const DEFAULT_COL_LABELS = [
  "1. Registro",
  "2. Precalificado",
  "3. Atención Comercial",
  "4. Pago Diagnóstico",
] as const;

function buildCols(config: AppConfig | null) {
  try {
    const labels = [
      config?.col1_name?.trim() || DEFAULT_COL_LABELS[0],
      config?.col2_name?.trim() || DEFAULT_COL_LABELS[1],
      config?.col3_name?.trim() || DEFAULT_COL_LABELS[2],
      config?.col4_name?.trim() || DEFAULT_COL_LABELS[3],
    ];
    return COL_STATIC.map((s, i) => ({ ...s, label: labels[i] }));
  } catch {
    return COL_STATIC.map((s, i) => ({ ...s, label: DEFAULT_COL_LABELS[i] }));
  }
}

function assignColumn(tags: ConvTag[]): StageTag | null {
  if (tags.includes("PAGO_DIAGNOSTICO"))   return "PAGO_DIAGNOSTICO";
  if (tags.includes("ATENCION_COMERCIAL")) return "ATENCION_COMERCIAL";
  if (tags.includes("PRECALIFICADO"))      return "PRECALIFICADO";
  if (tags.includes("REGISTRO"))           return "REGISTRO";
  return null;
}

function parseUTC(iso: string): Date {
  return new Date(iso.includes("Z") || iso.includes("+") ? iso : iso.replace(" ", "T") + "Z");
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - parseUTC(iso).getTime()) / 1000);
  if (diff < 60)    return "hace un momento";
  if (diff < 3600)  return `hace ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
  return `hace ${Math.floor(diff / 86400)}d`;
}

function MetricsBar({ leads, config }: { leads: Lead[]; config: AppConfig | null }) {
  const total        = leads.length;
  const nombreAsesor = config?.nombre_asesor?.trim()  || "Asesor";
  const valorConv    = (() => {
    try {
      const n = Number(config?.valor_conversion);
      return isFinite(n) && n > 0 ? n : 380;
    } catch { return 380; }
  })();
  const moneda = config?.moneda?.trim() || "PEN";

  const salesCount = leads.filter((l) => l.tags.includes("PAGO_DIAGNOSTICO")).length;
  const salesRate  = total > 0 ? ((salesCount / total) * 100).toFixed(1) : "0.0";

  const qualCount = leads.filter(
    (l) =>
      l.tags.includes("PRECALIFICADO") ||
      l.tags.includes("ATENCION_COMERCIAL") ||
      l.tags.includes("PAGO_DIAGNOSTICO")
  ).length;
  const qualRate = total > 0 ? ((qualCount / total) * 100).toFixed(1) : "0.0";

  const derivCount = leads.filter(
    (l) => l.tags.includes("ATENCION_COMERCIAL") || l.tags.includes("PAGO_DIAGNOSTICO")
  ).length;
  const derivRate = total > 0 ? ((derivCount / total) * 100).toFixed(1) : "0.0";

  const noCalCount    = leads.filter((l) => l.tags.includes("NO_CALIFICA")).length;
  const atencionCount = leads.filter((l) => l.tags.includes("ATENCION_COMERCIAL")).length;
  const denomCierre   = atencionCount + salesCount;
  const closeRate     = denomCierre > 0 ? ((salesCount / denomCierre) * 100).toFixed(1) : "0.0";

  const totalValue    = atencionCount * valorConv;
  const totalValueFmt = `${moneda} ${totalValue.toLocaleString("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const metrics = [
    { value: `${salesRate}%`,  label: "Conversión (Ventas Cerradas)",         color: "text-emerald-700" },
    { value: `${qualRate}%`,   label: "Calificación (Pasaron filtro)",        color: "text-blue-700"    },
    { value: `${derivRate}%`,  label: "Derivados (Traspaso a Humano)",        color: "text-violet-700"  },
    { value: `${noCalCount}`,  label: "Leads No Calificados",                 color: "text-red-600"     },
    { value: `${closeRate}%`,  label: `Cierre (Efectividad ${nombreAsesor})`, color: "text-amber-700"   },
    { value: totalValueFmt,    label: "Valor Total",                          color: "text-purple-700"  },
  ];

  return (
    <div className="shrink-0 px-6 py-2 bg-white border-b border-gray-100 flex items-center gap-1 overflow-x-auto">
      {metrics.map((m, i) => (
        <span key={m.label} className="flex items-baseline gap-1.5 shrink-0">
          {i > 0 && <span className="text-gray-200 mx-2 select-none">|</span>}
          <span className={`text-sm font-bold ${m.color}`}>{m.value}</span>
          <span className="text-xs text-gray-400">{m.label}</span>
        </span>
      ))}
    </div>
  );
}

type CaritaKey = "feliz" | "seria" | "triste" | "estrella" | "dinero" | "chat";

const CARITA_CFG: Record<CaritaKey, { label: string; color: string }> = {
  triste:   { label: "Triste",  color: "#EF4444" },
  chat:     { label: "Nuevo",   color: "#EF4444" },
  seria:    { label: "Seria",   color: "#EAB308" },
  feliz:    { label: "Feliz",   color: "#10B981" },
  estrella: { label: "¡Listo!", color: "#F97316" },
  dinero:   { label: "¡Venta!", color: "#10B981" },
};

function resolveCarita(scoring: number, tags: ConvTag[]): CaritaKey {
  if (tags.includes("PAGO_DIAGNOSTICO"))   return "dinero";
  if (tags.includes("ATENCION_COMERCIAL")) return "estrella";
  if (tags.includes("NO_CALIFICA"))        return "triste";
  if (tags.includes("REGISTRO"))           return "chat";
  if (scoring >= 70) return "feliz";
  if (scoring >= 40) return "seria";
  return "seria";
}

function CaritaSVG({ type, color }: { type: CaritaKey; color: string }) {
  const base = {
    width: 24, height: 24, viewBox: "0 0 24 24",
    fill: "none", stroke: color, strokeWidth: 2,
    strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };

  const stdEyes = (
    <>
      <circle cx="9"  cy="9.5" r="0.65" fill={color} stroke="none" />
      <circle cx="15" cy="9.5" r="0.65" fill={color} stroke="none" />
    </>
  );

  const sparkleEye = (cx: number, cy: number) => (
    <g stroke={color} strokeWidth={0.85} strokeLinecap="round">
      <line x1={cx - 1}   y1={cy}       x2={cx + 1}   y2={cy}       />
      <line x1={cx}       y1={cy - 1}   x2={cx}       y2={cy + 1}   />
      <line x1={cx - 0.7} y1={cy - 0.7} x2={cx + 0.7} y2={cy + 0.7} />
      <line x1={cx + 0.7} y1={cy - 0.7} x2={cx - 0.7} y2={cy + 0.7} />
    </g>
  );

  const smile = <path d="M8 14c1 1.5 2.5 2.2 4 2.2s3-.7 4-2.2" />;

  switch (type) {
    case "feliz":
      return <svg {...base}><circle cx="12" cy="12" r="10" />{stdEyes}{smile}</svg>;
    case "seria":
      return <svg {...base}><circle cx="12" cy="12" r="10" />{stdEyes}<line x1="8.5" y1="15" x2="15.5" y2="15" /></svg>;
    case "triste":
      return <svg {...base}><circle cx="12" cy="12" r="10" />{stdEyes}<path d="M8 16.5c1-1.5 2.5-2.2 4-2.2s3 .7 4 2.2" /></svg>;
    case "estrella":
      return <svg {...base}><circle cx="12" cy="12" r="10" />{sparkleEye(9, 9.5)}{sparkleEye(15, 9.5)}{smile}</svg>;
    case "dinero":
      return (
        <svg {...base}>
          <circle cx="12" cy="12" r="10" />
          <text x="9"  y="9.5" textAnchor="middle" dominantBaseline="central" fontSize="5" fontWeight="bold" fill={color} stroke="none">$</text>
          <text x="15" y="9.5" textAnchor="middle" dominantBaseline="central" fontSize="5" fontWeight="bold" fill={color} stroke="none">$</text>
          {smile}
        </svg>
      );
    case "chat":
      return (
        <svg {...base}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <circle cx="8"  cy="10" r="0.8" fill={color} stroke="none" />
          <circle cx="12" cy="10" r="0.8" fill={color} stroke="none" />
          <circle cx="16" cy="10" r="0.8" fill={color} stroke="none" />
        </svg>
      );
  }
}

function CaritaIndicator({ scoring, tags }: { scoring: number; tags: ConvTag[] }) {
  const key = resolveCarita(scoring, tags);
  const { label, color } = CARITA_CFG[key];
  return (
    <div className="flex items-center gap-1.5">
      <CaritaSVG type={key} color={color} />
      <span style={{ fontSize: 10, fontWeight: 700, color }}>{label}</span>
    </div>
  );
}

function LeadCard({ lead, isNoCalifica, onSelect }: { lead: Lead; isNoCalifica: boolean; onSelect: (id: string) => void }) {
  const name    = lead.metadata?.pushName ?? lead.name ?? lead.phone;
  const initial = (name[0] ?? "?").toUpperCase();

  return (
    <div
      onClick={() => onSelect(lead.id)}
      className={[
        "bg-white rounded-xl p-3 mb-2 cursor-pointer shadow-sm border transition-shadow hover:shadow-md select-none",
        isNoCalifica ? "opacity-50 border-red-300" : "border-gray-100 hover:border-gray-200",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <span className="text-sm font-bold text-gray-900 truncate leading-tight">{name}</span>
            <span className="text-[10px] text-gray-400 shrink-0 ml-1">{relativeTime(lead.last_message_at)}</span>
          </div>
          <span className="text-xs text-gray-400 truncate block">{lead.phone}</span>
          {(lead.lead_scoring > 0 ||
            lead.tags.some(t =>
              (["NO_CALIFICA", "REGISTRO", "ATENCION_COMERCIAL", "PAGO_DIAGNOSTICO"] as ConvTag[]).includes(t)
            )) && (
            <div className="mt-1.5">
              <CaritaIndicator scoring={lead.lead_scoring} tags={lead.tags} />
            </div>
          )}
          {lead.ai_summary && (
            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2 leading-snug">{lead.ai_summary}</p>
          )}
          {isNoCalifica && (
            <span className="mt-1.5 inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase bg-red-100 text-red-600">
              NO CALIFICA
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function KanbanColumn({ col, leads, showNoCalifica, onSelect }: {
  col:            ReturnType<typeof buildCols>[number];
  leads:          Lead[];
  showNoCalifica: boolean;
  onSelect:       (id: string) => void;
}) {
  const visible = leads.filter((l) => showNoCalifica || !l.tags.includes("NO_CALIFICA"));

  return (
    <div className={`flex flex-col h-full rounded-xl border ${col.borderColor} ${col.colBg} overflow-hidden`}>
      <div className={`${col.headerBg} px-4 py-3 flex items-center justify-between shrink-0`}>
        <span className="text-white text-xs font-bold tracking-wide truncate">{col.label}</span>
        <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2">
          {visible.length}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {visible.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8 px-2">Sin leads en esta etapa.</p>
        ) : (
          visible.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              isNoCalifica={lead.tags.includes("NO_CALIFICA")}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function PipelineBoard({ onSelectConv }: PipelineBoardProps) {
  const [leads,          setLeads]          = useState<Lead[]>([]);
  const [config,         setConfig]         = useState<AppConfig | null>(null);
  const [showNoCalifica, setShowNoCalifica] = useState(false);

  const loadLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations");
      if (!res.ok) throw new Error("fetch failed");
      setLeads(await res.json());
    } catch (err) {
      console.error("[PipelineBoard] Error cargando leads:", err);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/app-config");
      if (!res.ok) throw new Error("config fetch failed");
      setConfig(await res.json());
    } catch { /* fallback defensivo */ }
  }, []);

  useEffect(() => {
    loadLeads();
    loadConfig();
  }, [loadLeads, loadConfig]);

  useEffect(() => {
    const handler = () => loadConfig();
    window.addEventListener("app-config-updated", handler);
    return () => window.removeEventListener("app-config-updated", handler);
  }, [loadConfig]);

  useEffect(() => {
    const handler = () => loadLeads();
    window.addEventListener("pipeline-stage-updated", handler);
    return () => window.removeEventListener("pipeline-stage-updated", handler);
  }, [loadLeads]);

  const RELEVANT_WS = ["message:new", "message:sent", "chat:updated", "conversation:new"];
  const { connected } = useWebSocket(
    useCallback((e: WsEvent) => {
      if (RELEVANT_WS.includes(e.type)) loadLeads();
      if (e.type === "config:updated") loadConfig();
    }, [loadLeads, loadConfig])  // eslint-disable-line react-hooks/exhaustive-deps
  );

  useSSE(
    useCallback((e: WsEvent) => {
      if (RELEVANT_WS.includes(e.type)) loadLeads();
      if (e.type === "config:updated") loadConfig();
    }, [loadLeads, loadConfig])  // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (connected) return;
    const id = setInterval(loadLeads, 2_000);
    return () => clearInterval(id);
  }, [connected, loadLeads]);

  const COLS = buildCols(config);

  const byColumn = new Map<StageTag, Lead[]>(COLS.map((c) => [c.tag, []]));
  for (const lead of leads) {
    const col = assignColumn(lead.tags);
    if (col) byColumn.get(col)!.push(lead);
  }

  const totalActive     = leads.filter((l) => !l.tags.includes("NO_CALIFICA")).length;
  const totalNoCalifica = leads.filter((l) => l.tags.includes("NO_CALIFICA")).length;

  return (
    <div className="flex flex-col h-full bg-[#f7f6fc] overflow-hidden">

      <div className="shrink-0 px-6 py-3 bg-white border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900">Pipeline de Leads</h2>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {totalActive} activos
          </span>
        </div>

        <button
          onClick={() => setShowNoCalifica((v) => !v)}
          className={[
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border",
            showNoCalifica
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-white border-gray-200 text-gray-500 hover:text-gray-700",
          ].join(" ")}
        >
          <span className={[
            "w-7 h-4 rounded-full transition-colors flex items-center px-0.5",
            showNoCalifica ? "bg-red-400" : "bg-gray-300",
          ].join(" ")}>
            <span className={[
              "w-3 h-3 rounded-full bg-white shadow transition-transform",
              showNoCalifica ? "translate-x-3" : "translate-x-0",
            ].join(" ")} />
          </span>
          Mostrar No Calificados
          {totalNoCalifica > 0 && (
            <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {totalNoCalifica}
            </span>
          )}
        </button>
      </div>

      <MetricsBar leads={leads} config={config} />

      <div className="flex-1 overflow-x-auto overflow-y-hidden">
        <div className="grid grid-cols-4 gap-4 p-6 h-full min-w-[900px]">
          {COLS.map((col) => (
            <KanbanColumn
              key={col.tag}
              col={col}
              leads={byColumn.get(col.tag)!}
              showNoCalifica={showNoCalifica}
              onSelect={onSelectConv}
            />
          ))}
        </div>
      </div>

    </div>
  );
}
