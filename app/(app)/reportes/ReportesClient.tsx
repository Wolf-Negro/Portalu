"use client";

import { useRef, useState } from "react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Download } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type ReportType = "mensual" | "asesores" | "roi" | "embudo";

const REPORT_TYPES = [
  { id: "mensual"  as ReportType, label: "Rendimiento mensual" },
  { id: "asesores" as ReportType, label: "Análisis de asesores" },
  { id: "roi"      as ReportType, label: "ROI por canal" },
  { id: "embudo"   as ReportType, label: "Embudo de conversión" },
];

export default function ReportesClient({ leads, opportunities, campaigns, users, monthlyData }: {
  leads: any[]; opportunities: any[]; campaigns: any[]; users: any[];
  monthlyData: { mes: string; leads: number; ventas: number; ingresos: number }[];
}) {
  const [report,      setReport]      = useState<ReportType>("mensual");
  const [exporting,   setExporting]   = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  /* ─ chart ─ */
  const chartData = monthlyData.length > 0
    ? monthlyData
    : Array.from({ length: 6 }, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - (5 - i));
        return { mes: d.toLocaleString("es-PE", { month: "short" }), leads: 0, ventas: 0, ingresos: 0 };
      });

  /* ─ asesores ─ */
  const asesorData = users.map((u) => {
    const aLeads = leads.filter((l) => l.asesorId === u.id).length;
    const aOpps  = opportunities.filter((o) =>
      leads.find((l) => l.id === o.leadId && l.asesorId === u.id)
    ).length;
    return {
      name: u.name?.split(" ")[0] || "—",
      leads: aLeads,
      oportunidades: aOpps,
      conversion: aLeads > 0 ? Math.round((aOpps / aLeads) * 100) : 0,
    };
  });

  /* ─ ROI — calculado de datos reales ─ */
  const metaSpend  = campaigns.reduce((a: number, c: any) => a + (c.spent || 0), 0);
  const metaLeads  = campaigns.reduce((a: number, c: any) => a + (c.leads  || 0), 0);
  const metaRev    = opportunities
    .filter((o: any) => o.stage === "cerrado_ganado")
    .reduce((a: number, o: any) => a + (o.value || 0), 0);
  const metaRoas   = metaSpend > 0 ? Math.round((metaRev / metaSpend) * 10) / 10 : null;

  const byOrigin = (origin: string) => leads.filter((l: any) => l.origin === origin).length;

  const roiData = [
    { canal: "Meta Ads",    inversion: metaSpend,  leads: metaLeads,          roas: metaRoas,  real: true },
    { canal: "WhatsApp",    inversion: null,        leads: byOrigin("whatsapp"),  roas: null,  real: false },
    { canal: "Formularios", inversion: null,        leads: byOrigin("formulario"), roas: null, real: false },
    { canal: "Landing",     inversion: null,        leads: byOrigin("landing"),   roas: null,  real: false },
    { canal: "Otros",       inversion: null,        leads: byOrigin("otros"),     roas: null,  real: false },
  ].filter((r) => r.leads > 0 || r.real);

  /* ─ embudo ─ */
  const funnelData = [
    { name: "Leads totales",  value: leads.length,                                                           fill: "var(--color-lavender)" },
    { name: "Contactados",    value: leads.filter((l: any) => l.status !== "nuevo").length,                  fill: "var(--color-violet-dim)" },
    { name: "Calificados",    value: opportunities.length,                                                    fill: "var(--color-coral)" },
    { name: "Cerrados",       value: opportunities.filter((o: any) => o.stage === "cerrado_ganado").length,  fill: "var(--color-success)" },
  ];

  /* ─ PDF export via window.print ─ */
  async function handleExport() {
    setExporting(true);
    try {
      window.print();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in print:p-4">
      <style>{`@media print { .no-print { display: none !important; } }`}</style>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Reportes</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Análisis de rendimiento</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="no-print flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
          style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.2)", color: "var(--color-text-secondary)" }}
        >
          <Download size={14} />
          {exporting ? "Generando…" : "Exportar PDF"}
        </button>
      </div>

      {/* Report selector */}
      <div className="no-print flex gap-2 flex-wrap">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.id}
            onClick={() => setReport(r.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: report === r.id ? "rgba(114,85,180,0.3)" : "var(--color-surface-glass)",
              border: `1px solid ${report === r.id ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.2)"}`,
              color: report === r.id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Report content */}
      <div ref={contentRef} className="rounded-xl p-5"
        style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>

        {report === "mensual" && (
          <>
            <h3 className="font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Rendimiento mensual — últimos 6 meses</h3>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Total leads",    value: leads.length,                                                                                   color: "var(--color-lavender)" },
                { label: "Ventas cerradas",value: opportunities.filter((o: any) => o.stage === "cerrado_ganado").length,                         color: "var(--color-success)" },
                { label: "Ingresos totales",value: formatCurrency(opportunities.filter((o: any) => o.stage === "cerrado_ganado").reduce((a: number, o: any) => a + o.value, 0)), color: "var(--color-coral)" },
              ].map((s) => (
                <div key={s.label} className="p-4 rounded-xl text-center"
                  style={{ background: `${s.color}12`, border: `1px solid ${s.color}30` }}>
                  <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "var(--color-text-secondary)" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,85,180,0.08)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "var(--color-surface-1)", border: "1px solid rgba(114,85,180,0.3)", borderRadius: 8, fontSize: 12, color: "var(--color-text-primary)" }} />
                <Bar dataKey="leads"  fill="var(--color-lavender)" radius={[4,4,0,0]} name="Leads" />
                <Bar dataKey="ventas" fill="var(--color-coral)" radius={[4,4,0,0]} name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {report === "asesores" && (
          <>
            <h3 className="font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Rendimiento por asesor</h3>
            {asesorData.length === 0
              ? <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>Sin datos de asesores</p>
              : <div className="space-y-3">
                  {asesorData.map((a) => (
                    <div key={a.name} className="p-4 rounded-lg"
                      style={{ background: "rgba(43,9,111,0.15)", border: "1px solid rgba(114,85,180,0.15)" }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm" style={{ color: "var(--color-text-primary)" }}>{a.name}</span>
                        <span className="text-sm font-bold" style={{ color: "var(--color-lavender)" }}>{a.conversion}% conv.</span>
                      </div>
                      <div className="flex gap-4 text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
                        <span>{a.leads} leads</span>
                        <span>{a.oportunidades} opps.</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(114,85,180,0.15)" }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(a.conversion, 100)}%`, background: "linear-gradient(90deg, var(--color-violet-dim), var(--color-lavender))" }} />
                      </div>
                    </div>
                  ))}
                </div>
            }
          </>
        )}

        {report === "roi" && (
          <>
            <h3 className="font-semibold mb-1" style={{ color: "var(--color-text-primary)" }}>ROI por canal de adquisición</h3>
            <p className="text-xs mb-4" style={{ color: "var(--color-text-muted)" }}>
              ROAS real solo disponible para Meta Ads (requiere inversión registrada).
            </p>
            <div className="space-y-3">
              {roiData.map((r) => (
                <div key={r.canal} className="p-4 rounded-lg flex items-center gap-4"
                  style={{ background: "rgba(43,9,111,0.15)", border: "1px solid rgba(114,85,180,0.15)" }}>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1" style={{ color: "var(--color-text-primary)" }}>{r.canal}</p>
                    <div className="flex gap-4 text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {r.inversion !== null && <span>Inversión: {formatCurrency(r.inversion)}</span>}
                      <span>Leads: {r.leads}</span>
                      {r.inversion !== null && r.leads > 0 && (
                        <span>CPL: {formatCurrency(r.inversion / r.leads)}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right min-w-[52px]">
                    {r.roas !== null ? (
                      <>
                        <div className="text-xl font-bold"
                          style={{ color: r.roas >= 5 ? "var(--color-success)" : r.roas >= 3 ? "var(--color-warning)" : "var(--color-danger)" }}>
                          {r.roas}x
                        </div>
                        <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>ROAS</div>
                      </>
                    ) : (
                      <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>Sin datos<br/>de inversión</div>
                    )}
                  </div>
                </div>
              ))}
              {roiData.length === 0 && (
                <p className="text-sm text-center py-8" style={{ color: "var(--color-text-muted)" }}>Sin datos de leads aún.</p>
              )}
            </div>
          </>
        )}

        {report === "embudo" && (
          <>
            <h3 className="font-semibold mb-4" style={{ color: "var(--color-text-primary)" }}>Embudo de conversión</h3>
            <div className="space-y-3 max-w-lg mx-auto">
              {funnelData.map((step) => {
                const pct = funnelData[0].value > 0 ? Math.round((step.value / funnelData[0].value) * 100) : 0;
                return (
                  <div key={step.name}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span style={{ color: "var(--color-text-secondary)" }}>{step.name}</span>
                      <span className="font-bold" style={{ color: "var(--color-text-primary)" }}>{step.value} ({pct}%)</span>
                    </div>
                    <div className="h-8 rounded-lg overflow-hidden" style={{ background: "rgba(114,85,180,0.1)" }}>
                      <div className="h-full rounded-lg transition-all"
                        style={{ width: `${Math.max(pct, 5)}%`, background: step.fill }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
