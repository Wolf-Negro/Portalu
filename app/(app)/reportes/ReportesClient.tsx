"use client";

import { useState } from "react";
import {
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { BarChart3, Download, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type ReportType = "mensual" | "asesores" | "roi" | "embudo";

const REPORT_TYPES = [
  { id: "mensual" as ReportType, label: "Rendimiento mensual" },
  { id: "asesores" as ReportType, label: "Análisis de asesores" },
  { id: "roi" as ReportType, label: "ROI por canal" },
  { id: "embudo" as ReportType, label: "Embudo de conversión" },
];

export default function ReportesClient({ leads, opportunities, campaigns, users, monthlyData }: {
  leads: any[]; opportunities: any[]; campaigns: any[]; users: any[];
  monthlyData: { mes: string; leads: number; ventas: number; ingresos: number }[];
}) {
  const [report, setReport] = useState<ReportType>("mensual");

  const chartData = monthlyData.length > 0
    ? monthlyData
    : Array.from({ length: 6 }, (_, i) => {
        const date = new Date();
        date.setMonth(date.getMonth() - (5 - i));
        return {
          mes: date.toLocaleString("es-PE", { month: "short" }),
          leads: 0,
          ventas: 0,
          ingresos: 0,
        };
      });

  const asesorData = users.map((u) => {
    const asesorLeads = leads.filter((l) => l.asesorId === u.id).length;
    const asesorOpps = opportunities.filter((o) =>
      leads.find((l) => l.id === o.leadId && l.asesorId === u.id)
    ).length;
    return {
      name: u.name?.split(" ")[0] || "—",
      leads: asesorLeads,
      oportunidades: asesorOpps,
      conversion: asesorLeads > 0 ? Math.round((asesorOpps / asesorLeads) * 100) : 0,
    };
  });

  const roiData = [
    { canal: "Meta Ads", inversion: campaigns.reduce((a, c) => a + c.spent, 0), leads: campaigns.reduce((a, c) => a + c.leads, 0), roas: 3.2 },
    { canal: "WhatsApp", inversion: 500, leads: 45, roas: 8.1 },
    { canal: "Formularios", inversion: 200, leads: 30, roas: 12.5 },
    { canal: "Landing", inversion: 300, leads: 20, roas: 6.7 },
  ];

  const funnelData = [
    { name: "Leads totales", value: leads.length, fill: "#7255b4" },
    { name: "Contactados", value: Math.floor(leads.length * 0.7), fill: "#2b096f" },
    { name: "Calificados", value: opportunities.length, fill: "#fa7553" },
    { name: "Cerrados", value: opportunities.filter((o) => o.stage === "cerrado_ganado").length, fill: "#22c55e" },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#e9e8e6" }}>Reportes</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a09bbf" }}>Análisis de rendimiento</p>
        </div>
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.2)", color: "#a09bbf" }}
        >
          <Download size={14} />
          Exportar PDF
        </button>
      </div>

      {/* Report selector */}
      <div className="flex gap-2 flex-wrap">
        {REPORT_TYPES.map((r) => (
          <button
            key={r.id}
            onClick={() => setReport(r.id)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: report === r.id ? "rgba(114,85,180,0.3)" : "rgba(22,22,42,0.8)",
              border: `1px solid ${report === r.id ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.2)"}`,
              color: report === r.id ? "#e9e8e6" : "#a09bbf",
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Report content */}
      <div className="rounded-xl p-5"
        style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>

        {report === "mensual" && (
          <>
            <h3 className="font-semibold mb-4" style={{ color: "#e9e8e6" }}>Rendimiento mensual — últimos 6 meses</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,85,180,0.08)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#5a5575" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#5a5575" }} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#141420", border: "1px solid rgba(114,85,180,0.3)", borderRadius: 8, fontSize: 12, color: "#e9e8e6" }} />
                <Bar dataKey="leads" fill="#7255b4" radius={[4, 4, 0, 0]} name="Leads" />
                <Bar dataKey="ventas" fill="#fa7553" radius={[4, 4, 0, 0]} name="Ventas" />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}

        {report === "asesores" && (
          <>
            <h3 className="font-semibold mb-4" style={{ color: "#e9e8e6" }}>Rendimiento por asesor</h3>
            {asesorData.length === 0 ? (
              <p className="text-sm text-center py-8" style={{ color: "#5a5575" }}>Sin datos de asesores</p>
            ) : (
              <div className="space-y-3">
                {asesorData.map((a) => (
                  <div key={a.name} className="p-4 rounded-lg"
                    style={{ background: "rgba(43,9,111,0.15)", border: "1px solid rgba(114,85,180,0.15)" }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm" style={{ color: "#e9e8e6" }}>{a.name}</span>
                      <span className="text-sm font-bold" style={{ color: "#7255b4" }}>{a.conversion}% conv.</span>
                    </div>
                    <div className="flex gap-4 text-xs" style={{ color: "#a09bbf" }}>
                      <span>{a.leads} leads</span>
                      <span>{a.oportunidades} opps.</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden"
                      style={{ background: "rgba(114,85,180,0.15)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(a.conversion, 100)}%`,
                          background: "linear-gradient(90deg, #2b096f, #7255b4)",
                        }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {report === "roi" && (
          <>
            <h3 className="font-semibold mb-4" style={{ color: "#e9e8e6" }}>ROI por canal de adquisición</h3>
            <div className="space-y-3">
              {roiData.map((r) => (
                <div key={r.canal} className="p-4 rounded-lg flex items-center gap-4"
                  style={{ background: "rgba(43,9,111,0.15)", border: "1px solid rgba(114,85,180,0.15)" }}>
                  <div className="flex-1">
                    <p className="font-medium text-sm mb-1" style={{ color: "#e9e8e6" }}>{r.canal}</p>
                    <div className="flex gap-4 text-xs" style={{ color: "#a09bbf" }}>
                      <span>Inversión: {formatCurrency(r.inversion)}</span>
                      <span>Leads: {r.leads}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold" style={{ color: r.roas >= 5 ? "#22c55e" : r.roas >= 3 ? "#f59e0b" : "#ef4444" }}>
                      {r.roas}x
                    </div>
                    <div className="text-xs" style={{ color: "#5a5575" }}>ROAS</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {report === "embudo" && (
          <>
            <h3 className="font-semibold mb-4" style={{ color: "#e9e8e6" }}>Embudo de conversión</h3>
            <div className="space-y-3 max-w-lg mx-auto">
              {funnelData.map((step, i) => {
                const pct = funnelData[0].value > 0
                  ? Math.round((step.value / funnelData[0].value) * 100)
                  : 0;
                return (
                  <div key={step.name}>
                    <div className="flex items-center justify-between mb-1 text-sm">
                      <span style={{ color: "#a09bbf" }}>{step.name}</span>
                      <span className="font-bold" style={{ color: "#e9e8e6" }}>
                        {step.value} ({pct}%)
                      </span>
                    </div>
                    <div className="h-8 rounded-lg overflow-hidden"
                      style={{ background: "rgba(114,85,180,0.1)" }}>
                      <div
                        className="h-full rounded-lg transition-all flex items-center px-3"
                        style={{ width: `${Math.max(pct, 5)}%`, background: step.fill }}>
                      </div>
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
