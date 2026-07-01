"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useState, useEffect, useRef } from "react";
import GridLayout from "react-grid-layout";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis as RechartsXAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { X, Zap, Send } from "lucide-react";
import { AluCharacter, AluAvatar, ALU_CHARACTER_STYLES, type AluMode } from "@/components/alu-ia/AluCharacter";
import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";
import { ChartSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import DateRangeCalendar from "@/components/ui/DateRangeCalendar";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetaData {
  spend: number; reach: number; impressions: number; clicks: number;
  linkClicks: number; outboundClicks: number; landingPageViews: number;
  leads: number; purchases: number; purchaseValue: number;
  ctr: number; cpc: number; cpm: number; frequency: number;
  videoViews: number; videoP25: number; videoP50: number; videoP75: number; videoP100: number;
  postEngagement: number; postReactions: number; postComments: number; postShares: number;
  messages: number;
  cpl: number; roas: number; costPerLandingPageView: number;
}

type Period = "today" | "last_7d" | "last_30d";
type ChartType = "line" | "bar" | "area";
type XAxis = "day" | "campaign" | "adset";

interface DashboardItem {
  id: string;
  type: "metric_card" | "chart" | "funnel" | "campaign_comparison";
  period: Period;
  metric?: string;
  metrics?: string[];
  xAxis?: XAxis;
  chartType?: ChartType;
  x: number; y: number; w: number; h: number;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Campaign {
  id: string;
  name: string;
  objective: string;
  objectiveLabel: string;
  category: string;
  relevantMetrics: string[];
  status: string;
  spend30d: number;
  leads30d: number;
  impressions30d?: number;
  clicks30d?: number;
  ctr30d?: number;
  cpc30d?: number;
  cpm30d?: number;
  reach30d?: number;
  primaryResult?: {
    type: string;
    label: string;
    count: number;
    cost: number;
  };
  hasMixedObjectives?: boolean;
}

interface Props {
  stats: {
    totalLeads: number;
    newLeads: number;
    opportunities: number;
    totalRevenue: number;
    conversionRate: string;
    alerts: number;
    pipelineValue: number;
    closedWon: number;
  };
  preferences: {
    platforms: string[];
    metrics: string[];
    goal: string;
    widgets: string[];
    items?: DashboardItem[];
  };
  performanceData: { day: string; leads: number; ventas: number }[];
  originData: { name: string; value: number; raw: number; color: string }[];
  recentActivities: any[];
  teamData: { name: string; role: string; leads: number; converted: number; convRate: number }[];
  weeklySummary: any;
  userName: string;
  companyName?: string | null;
  metaToday?: MetaData | null;
  metaMonthly?: MetaData | null;
  metaYesterday?: MetaData | null;
  metaError?: boolean;
  metaConfigured?: boolean;
  metaAccounts?: { accountId: string; label: string | null }[];
  dashboardConfigured: boolean;
  hasCRM: boolean;
}

// ─── Metric catalog ───────────────────────────────────────────────────────────

interface MetricConfig {
  id: string;
  label: string;
  group: "Rendimiento" | "Costos" | "Alcance" | "Clics" | "Video" | "Interacciones";
  format: "number" | "currency" | "percent" | "decimal";
  description: string;
  color: string;
  icon: string;
}

const METRIC_CATALOG: MetricConfig[] = [
  // RENDIMIENTO
  { id: "leads",            label: "Leads",              group: "Rendimiento",    format: "number",   description: "Leads generados desde Meta Ads",                  color: "var(--color-success)", icon: "🎯" },
  { id: "cpl",              label: "CPL",                group: "Rendimiento",    format: "currency", description: "Costo por lead",                                  color: "var(--color-lavender)", icon: "💰" },
  { id: "ctr",              label: "CTR",                group: "Rendimiento",    format: "percent",  description: "Click-through rate",                              color: "var(--color-warning)", icon: "📊" },
  { id: "roas",             label: "ROAS",               group: "Rendimiento",    format: "decimal",  description: "Retorno sobre inversión publicitaria",            color: "var(--color-success)", icon: "📈" },
  { id: "purchases",        label: "Compras",            group: "Rendimiento",    format: "number",   description: "Compras atribuidas a Meta Ads",                   color: "var(--color-coral)", icon: "🛒" },
  { id: "purchaseValue",    label: "Valor de compras",   group: "Rendimiento",    format: "currency", description: "Ingresos por compras desde Meta Ads",             color: "var(--color-success)", icon: "💵" },
  // COSTOS
  { id: "spend",            label: "Gasto",              group: "Costos",         format: "currency", description: "Inversión total en publicidad",                   color: "#1877f2", icon: "💸" },
  { id: "cpc",              label: "CPC",                group: "Costos",         format: "currency", description: "Costo por clic",                                  color: "var(--color-violet-soft)", icon: "🖱️" },
  { id: "cpm",              label: "CPM",                group: "Costos",         format: "currency", description: "Costo por mil impresiones",                       color: "var(--color-text-muted)", icon: "📺" },
  { id: "costPerLandingPageView", label: "Costo / visita", group: "Costos",       format: "currency", description: "Costo por visita a la página de destino",         color: "var(--color-coral)", icon: "🔗" },
  // ALCANCE
  { id: "reach",            label: "Alcance",            group: "Alcance",        format: "number",   description: "Personas únicas que vieron el anuncio",          color: "var(--color-lavender)", icon: "📡" },
  { id: "impressions",      label: "Impresiones",        group: "Alcance",        format: "number",   description: "Veces que se mostró el anuncio",                 color: "var(--color-text-muted)", icon: "👁️" },
  { id: "frequency",        label: "Frecuencia",         group: "Alcance",        format: "decimal",  description: "Promedio de veces visto por persona",            color: "var(--color-warning)", icon: "🔄" },
  // CLICS
  { id: "clicks",           label: "Clics totales",      group: "Clics",          format: "number",   description: "Clics totales en el anuncio",                    color: "var(--color-coral)", icon: "👆" },
  { id: "linkClicks",       label: "Clics en enlace",    group: "Clics",          format: "number",   description: "Clics en el enlace del anuncio",                 color: "var(--color-coral)", icon: "🔗" },
  { id: "landingPageViews", label: "Visitas a página",   group: "Clics",          format: "number",   description: "Visitas a la página de destino",                 color: "var(--color-success)", icon: "🌐" },
  { id: "outboundClicks",   label: "Clics salientes",    group: "Clics",          format: "number",   description: "Clics que llevan fuera de Meta",                 color: "#1877f2", icon: "↗️" },
  // VIDEO
  { id: "videoViews",       label: "Reproducciones",     group: "Video",          format: "number",   description: "Reproducciones de video (3+ segundos)",          color: "var(--color-violet-soft)", icon: "▶️" },
  { id: "videoP25",         label: "Video 25%",          group: "Video",          format: "number",   description: "Video visto hasta el 25%",                       color: "var(--color-lavender)", icon: "⏱️" },
  { id: "videoP50",         label: "Video 50%",          group: "Video",          format: "number",   description: "Video visto hasta el 50%",                       color: "var(--color-lavender)", icon: "⏱️" },
  { id: "videoP75",         label: "Video 75%",          group: "Video",          format: "number",   description: "Video visto hasta el 75%",                       color: "var(--color-lavender)", icon: "⏱️" },
  { id: "videoP100",        label: "Video completo",     group: "Video",          format: "number",   description: "Video visto hasta el final",                     color: "var(--color-success)", icon: "✅" },
  // INTERACCIONES
  { id: "postEngagement",   label: "Interacciones",      group: "Interacciones",  format: "number",   description: "Total de interacciones con la publicación",      color: "var(--color-warning)", icon: "❤️" },
  { id: "postReactions",    label: "Reacciones",         group: "Interacciones",  format: "number",   description: "Likes, love, wow, etc.",                         color: "var(--color-coral)", icon: "👍" },
  { id: "postComments",     label: "Comentarios",        group: "Interacciones",  format: "number",   description: "Comentarios en la publicación",                  color: "var(--color-violet-soft)", icon: "💬" },
  { id: "postShares",       label: "Compartidos",        group: "Interacciones",  format: "number",   description: "Veces que se compartió el anuncio",              color: "#1877f2", icon: "🔁" },
  { id: "messages",         label: "Mensajes",           group: "Interacciones",  format: "number",   description: "Conversaciones iniciadas por mensaje",           color: "#25d366", icon: "💬" },
];

// ─── Default items ────────────────────────────────────────────────────────────

const DEFAULT_ITEMS: DashboardItem[] = [
  { id: "leads-0",  type: "metric_card", metric: "leads",  period: "today",    x: 0,  y: 0, w: 3, h: 2 },
  { id: "spend-0",  type: "metric_card", metric: "spend",  period: "today",    x: 3,  y: 0, w: 3, h: 2 },
  { id: "cpl-0",    type: "metric_card", metric: "cpl",    period: "today",    x: 6,  y: 0, w: 3, h: 2 },
  { id: "ctr-0",    type: "metric_card", metric: "ctr",    period: "today",    x: 9,  y: 0, w: 3, h: 2 },
  { id: "chart-0",  type: "chart", metrics: ["leads", "spend"], xAxis: "day", chartType: "area", period: "last_30d", x: 0, y: 2, w: 8, h: 5 },
  { id: "clicks-0", type: "metric_card", metric: "clicks", period: "today",    x: 8,  y: 2, w: 2, h: 2 },
  { id: "reach-0",  type: "metric_card", metric: "reach",  period: "today",    x: 10, y: 2, w: 2, h: 2 },
  { id: "campaign_comparison-0", type: "campaign_comparison", period: "last_30d", x: 0, y: 7, w: 12, h: 4 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMetricValue(value: number, format: MetricConfig["format"]): string {
  if (!isFinite(value) || isNaN(value)) return "—";
  switch (format) {
    case "currency": return `S/ ${value.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "percent":  return `${value.toFixed(2)}%`;
    case "decimal":  return value.toFixed(2);
    case "number":   return value.toLocaleString("es-PE");
  }
}

function getMetricValue(metricId: string, data: MetaData | null | undefined): number | null {
  if (!data) return null;
  const v = (data as unknown as Record<string, number>)[metricId];
  return typeof v === "number" ? v : null;
}

function parseInitialItems(prefs: Props["preferences"]): DashboardItem[] {
  if (prefs.items && Array.isArray(prefs.items) && prefs.items.length > 0) {
    const valid = prefs.items.filter((item: any) => item.id && item.type && typeof item.x === "number");
    if (valid.length > 0) return valid as DashboardItem[];
  }
  return DEFAULT_ITEMS;
}

// ─── MetricCardContent ────────────────────────────────────────────────────────

function MetricCardContent({
  item, metaToday, metaMonthly, metaYesterday, metaError, metaConfigured,
}: {
  item: DashboardItem;
  metaToday?: MetaData | null;
  metaMonthly?: MetaData | null;
  metaYesterday?: MetaData | null;
  metaError?: boolean;
  metaConfigured?: boolean;
}) {
  const cfg = METRIC_CATALOG.find((m) => m.id === item.metric);
  const data = item.period === "today" ? metaToday : metaMonthly;
  const raw = item.metric ? getMetricValue(item.metric, data) : null;
  const formatted = raw !== null && cfg ? formatMetricValue(raw, cfg.format) : null;

  // Delta vs previous period
  const prevData = item.period === "today" ? metaYesterday : null;
  const prevRaw = prevData && item.metric ? getMetricValue(item.metric, prevData) : null;

  let delta: number | null = null;
  let deltaPositive = true;
  if (raw !== null && prevRaw !== null && prevRaw > 0) {
    delta = ((raw - prevRaw) / prevRaw) * 100;
    const costMetrics = ["cpl", "cpc", "cpm", "spend", "costPerLandingPageView"];
    deltaPositive = costMetrics.includes(item.metric ?? "") ? delta < 0 : delta > 0;
  }

  if (!formatted) {
    let message = "Sin datos";
    if (data === null || data === undefined) {
      if (metaError) message = "Error al cargar";
      else if (metaConfigured === false) message = "Conecta Meta Ads";
    }

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", gap: 8,
        color: "#94a3b8", padding: "0 16px",
      }}>
        <span style={{ fontSize: 24 }}>{cfg?.icon ?? "📊"}</span>
        <span style={{ fontSize: 11, textAlign: "center", fontWeight: 500 }}>{message}</span>
      </div>
    );
  }

  // Mapa de colores de métrica → color de ícono AriClaro-style
  const metricColor = cfg?.color ?? "#7C3AED";
  const iconBg = metricColor.includes("success") || metricColor.includes("22c55e")
    ? "#10b981"
    : metricColor.includes("coral") || metricColor.includes("fa7553") || metricColor.includes("ef4444")
    ? "#f43f5e"
    : metricColor.includes("warning") || metricColor.includes("f59e0b")
    ? "#f97316"
    : metricColor.includes("1877f2")
    ? "#3b82f6"
    : "#7c3aed";

  const badgeLabel = item.period === "today" ? "HOY" : item.period === "last_7d" ? "7D" : "30D";

  return (
    <div style={{
      padding: "20px 22px", height: "100%", display: "flex", flexDirection: "column",
      justifyContent: "center", position: "relative", overflow: "hidden",
    }}>
      {/* Decoración de esquina sutil */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: 96, height: 96,
        background: `${iconBg}08`, borderBottomLeftRadius: "100%",
        marginRight: -40, marginTop: -40, pointerEvents: "none",
      }} />

      {/* Fila superior: ícono + badge */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 14,
          background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 6px 16px -4px ${iconBg}60`,
          fontSize: 18,
        }}>
          <span>{cfg?.icon ?? "📊"}</span>
        </div>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "0.1em",
          padding: "3px 8px", borderRadius: 8,
          background: `${iconBg}15`, color: iconBg,
          textTransform: "uppercase",
        }}>
          {badgeLabel}
        </span>
      </div>

      {/* Label */}
      <p style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginBottom: 4 }}>
        {cfg?.label ?? cfg?.description}
      </p>

      {/* Número principal */}
      <h4 style={{
        fontSize: 32, fontWeight: 900, color: "#1e0b42",
        letterSpacing: "-0.04em", lineHeight: 1, margin: 0,
      }}>
        {formatted}
      </h4>

      {/* Delta */}
      {delta !== null && (
        <div style={{
          marginTop: 10, display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, fontWeight: 700,
          color: deltaPositive ? "#10b981" : "#f43f5e",
          background: deltaPositive ? "#10b98115" : "#f43f5e15",
          padding: "3px 9px", borderRadius: 20, width: "fit-content",
        }}>
          <span>{delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%</span>
          <span style={{ fontWeight: 400, opacity: 0.65 }}>vs ayer</span>
        </div>
      )}
    </div>
  );
}

// ─── ChartContent ─────────────────────────────────────────────────────────────

function ChartContent({ item, campaignId }: { item: DashboardItem; campaignId?: string | null }) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const metricsKey = (item.metrics ?? []).join(",");

  function load() {
    setLoading(true);
    setError(false);
    const metrics = (item.metrics ?? []).join(",");
    if (!metrics) { setLoading(false); return; }
    const campaignParam = campaignId ? `&campaign_id=${campaignId}` : "";
    const url = `/api/dashboard/meta-chart?metrics=${metrics}&period=${item.period}&breakdown=${item.xAxis ?? "day"}${campaignParam}`;
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error("Error"); return r.json(); })
      .then((d) => { setChartData(d.data ?? []); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }

  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metricsKey, item.period, item.xAxis, campaignId]);

  if (loading) {
    return <ChartSkeleton compact />;
  }

  if (error) {
    return <ErrorState message="No se pudieron cargar los datos." onRetry={load} />;
  }

  if (!chartData.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: 12 }}>
        Sin datos para este período
      </div>
    );
  }

  const colors = ["var(--color-lavender)", "var(--color-success)", "var(--color-coral)"];
  const isBar = item.chartType === "bar";

  return (
    <ResponsiveContainer width="100%" height="100%">
      {isBar ? (
        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,85,180,0.07)" />
          <RechartsXAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "var(--color-surface-card)", border: "1px solid rgba(114,85,180,0.3)", borderRadius: 8, fontSize: 11, color: "var(--color-text-primary)" }} />
          {(item.metrics ?? []).map((metricId, idx) => {
            const cfg = METRIC_CATALOG.find((m) => m.id === metricId);
            const color = colors[idx] ?? "var(--color-lavender)";
            return <Bar key={metricId} dataKey={metricId} fill={color} name={cfg?.label ?? metricId} radius={[3, 3, 0, 0]} />;
          })}
        </BarChart>
      ) : (
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,85,180,0.07)" />
          <RechartsXAxis dataKey="label" tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 9, fill: "var(--color-text-muted)" }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ background: "var(--color-surface-card)", border: "1px solid rgba(114,85,180,0.3)", borderRadius: 8, fontSize: 11, color: "var(--color-text-primary)" }} />
          {(item.metrics ?? []).map((metricId, idx) => {
            const cfg = METRIC_CATALOG.find((m) => m.id === metricId);
            const color = colors[idx] ?? "var(--color-lavender)";
            return (
              <Area
                key={metricId}
                type="monotone"
                dataKey={metricId}
                stroke={color}
                strokeWidth={2}
                fill={color}
                fillOpacity={0.2}
                name={cfg?.label ?? metricId}
              />
            );
          })}
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

// ─── FunnelContent ────────────────────────────────────────────────────────────

function FunnelContent({ metaToday, selectedCampaign, metaError, metaConfigured }: {
  metaToday?: MetaData | null;
  selectedCampaign?: Campaign | null;
  metaError?: boolean;
  metaConfigured?: boolean;
}) {
  const category = selectedCampaign?.category ?? "leads";

  type FunnelStep = { label: string; value: number; color: string; icon: string };
  let steps: FunnelStep[] = [];

  if (!metaToday) {
    const message = metaError
      ? "Error al cargar datos de Meta Ads. Intenta recargar la página."
      : metaConfigured === false
        ? "Conecta tu cuenta de Meta Ads para ver el embudo"
        : "Sin datos para este período";
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: 12 }}>
        {message}
      </div>
    );
  }

  if (category === "leads") {
    steps = [
      { label: "Impresiones",  value: metaToday.impressions,      color: "#1877f2", icon: "👁️" },
      { label: "Clics",        value: metaToday.clicks,           color: "var(--color-lavender)", icon: "👆" },
      { label: "Visitas",      value: metaToday.landingPageViews, color: "var(--color-violet-soft)", icon: "🌐" },
      { label: "Leads",        value: metaToday.leads,            color: "var(--color-success)", icon: "🎯" },
    ];
  } else if (category === "sales") {
    steps = [
      { label: "Impresiones",  value: metaToday.impressions,      color: "#1877f2", icon: "👁️" },
      { label: "Clics",        value: metaToday.clicks,           color: "var(--color-lavender)", icon: "👆" },
      { label: "Visitas",      value: metaToday.landingPageViews, color: "var(--color-violet-soft)", icon: "🌐" },
      { label: "Compras",      value: metaToday.purchases,        color: "var(--color-success)", icon: "🛒" },
    ];
  } else if (category === "awareness") {
    steps = [
      { label: "Impresiones",   value: metaToday.impressions,    color: "#1877f2", icon: "👁️" },
      { label: "Alcance",       value: metaToday.reach,          color: "var(--color-lavender)", icon: "📡" },
      { label: "Interacciones", value: metaToday.postEngagement, color: "var(--color-warning)", icon: "❤️" },
    ];
  } else {
    steps = [
      { label: "Impresiones",  value: metaToday.impressions,      color: "#1877f2", icon: "👁️" },
      { label: "Clics",        value: metaToday.linkClicks,       color: "var(--color-lavender)", icon: "👆" },
      { label: "Visitas",      value: metaToday.landingPageViews, color: "var(--color-violet-soft)", icon: "🌐" },
    ];
  }

  const maxValue = steps[0]?.value ?? 1;

  return (
    <div style={{ padding: "12px 16px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-around", gap: 6 }}>
      {steps.map((step, i) => {
        const pct = maxValue > 0 ? (step.value / maxValue) * 100 : 0;
        const convRate = i > 0 && steps[i - 1].value > 0
          ? ((step.value / steps[i - 1].value) * 100).toFixed(1)
          : null;
        return (
          <div key={step.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <div style={{ fontSize: 11, color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                <span>{step.icon}</span>
                <span>{step.label}</span>
                {convRate && (
                  <span style={{ fontSize: 10, color: "var(--color-text-muted)", marginLeft: 4 }}>
                    ({convRate}% conversión)
                  </span>
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: step.color }}>
                {step.value.toLocaleString("es-PE")}
              </span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${pct}%`, background: step.color,
                borderRadius: 3, transition: "width 0.5s ease",
                opacity: 0.85,
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── CampaignComparisonContent ────────────────────────────────────────────────

function CampaignComparisonContent({ campaigns, error, onRetry }: { campaigns: Campaign[]; error?: boolean; onRetry?: () => void }) {
  const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE");
  const displayCampaigns = activeCampaigns.length > 0 ? activeCampaigns : campaigns;

  if (error) {
    return <ErrorState message="No se pudieron cargar las campañas." onRetry={onRetry} />;
  }

  if (displayCampaigns.length === 0) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--color-text-muted)", fontSize: 12 }}>
        Sin campañas activas
      </div>
    );
  }

  const categoryColors: Record<string, string> = {
    leads: "var(--color-success)",
    sales: "var(--color-warning)",
    traffic: "#1877f2",
    awareness: "var(--color-violet-soft)",
    engagement: "var(--color-coral)",
    general: "var(--color-text-muted)",
  };

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "8px 12px" }}>
      {/* Header row */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 100px 80px 90px 70px",
        gap: 8, padding: "4px 8px", marginBottom: 4,
        fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        <span>Campaña</span>
        <span style={{ textAlign: "right" }}>Objetivo</span>
        <span style={{ textAlign: "right" }}>Resultado</span>
        <span style={{ textAlign: "right" }}>C/Resultado</span>
        <span style={{ textAlign: "right" }}>Gasto</span>
      </div>

      {displayCampaigns.map((c, i) => {
        const color = categoryColors[c.category] ?? "var(--color-text-muted)";
        const result = c.primaryResult;

        return (
          <div
            key={c.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 80px 90px 70px",
              gap: 8,
              padding: "9px 8px",
              borderRadius: 8,
              background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
              alignItems: "center",
              fontSize: 12,
            }}
          >
            {/* Name + indicator */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <div style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: c.status === "ACTIVE" ? "var(--color-success)" : "var(--color-text-muted)",
                  flexShrink: 0,
                }} />
                <span style={{
                  color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  fontSize: 11.5,
                }}>
                  {c.name}
                </span>
                {c.hasMixedObjectives && (
                  <span title="Esta campaña puede tener conjuntos con diferentes objetivos" style={{ fontSize: 10, cursor: "help" }}>⚠️</span>
                )}
              </div>
            </div>

            {/* Objective */}
            <div style={{ textAlign: "right" }}>
              <span style={{
                fontSize: 10, fontWeight: 600, color,
                background: `color-mix(in srgb, ${color} 15%, transparent)`, padding: "2px 6px", borderRadius: 4,
              }}>
                {c.objectiveLabel.split(" ")[0]}
              </span>
            </div>

            {/* Result count */}
            <div style={{ textAlign: "right", color: color, fontWeight: 700, fontSize: 13 }}>
              {result ? (
                result.count > 0
                  ? result.count >= 1000
                    ? `${(result.count / 1000).toFixed(1)}K`
                    : result.count.toLocaleString("es-PE")
                  : "—"
              ) : "—"}
            </div>

            {/* Cost per result */}
            <div style={{ textAlign: "right", color: "var(--color-text-secondary)", fontSize: 11.5 }}>
              {result && result.cost > 0 ? (
                c.category === "awareness"
                  ? `S/${result.cost.toFixed(2)} CPM`
                  : `S/${result.cost.toFixed(2)}`
              ) : "—"}
            </div>

            {/* Spend */}
            <div style={{ textAlign: "right", color: "var(--color-text-faint)", fontSize: 11.5 }}>
              {c.spend30d > 0 ? `S/${c.spend30d.toFixed(0)}` : "—"}
            </div>
          </div>
        );
      })}

      {/* Footer */}
      <div style={{
        marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(114,85,180,0.1)",
        fontSize: 10, color: "var(--color-text-faint)", textAlign: "right",
      }}>
        Últimos 30 días · Todas las campañas activas
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DashboardClient({
  stats, preferences, userName, companyName, metaToday: initialMetaToday, metaMonthly: initialMetaMonthly, metaYesterday: initialMetaYesterday,
  metaError: initialMetaError, metaConfigured,
  metaAccounts = [],
  dashboardConfigured,
}: Props) {

  const { showToast } = useToast();

  // ── Selector de cuenta publicitaria de Meta ────────────────────────────────
  // null = combinado (todas las cuentas). Los valores iniciales vienen del
  // servidor ya combinados; al elegir una cuenta específica se refetchea.
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);
  const [metaToday, setMetaToday] = useState<MetaData | null | undefined>(initialMetaToday);
  const [metaMonthly, setMetaMonthly] = useState<MetaData | null | undefined>(initialMetaMonthly);
  const [metaYesterday, setMetaYesterday] = useState<MetaData | null | undefined>(initialMetaYesterday);
  const [metaError, setMetaError] = useState<boolean | undefined>(initialMetaError);
  const [metaSummaryLoading, setMetaSummaryLoading] = useState(false);

  useEffect(() => {
    if (selectedAccountId === null) {
      setMetaToday(initialMetaToday);
      setMetaMonthly(initialMetaMonthly);
      setMetaYesterday(initialMetaYesterday);
      setMetaError(initialMetaError);
      return;
    }
    setMetaSummaryLoading(true);
    fetch(`/api/dashboard/meta-summary?account_id=${selectedAccountId}`)
      .then((r) => r.json())
      .then((d) => {
        setMetaToday(d.metaToday ?? null);
        setMetaMonthly(d.metaMonthly ?? null);
        setMetaYesterday(d.metaYesterday ?? null);
        setMetaError(!!d.metaError);
      })
      .catch(() => setMetaError(true))
      .finally(() => setMetaSummaryLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // ── Items state ────────────────────────────────────────────────────────────
  const [items, setItems] = useState<DashboardItem[]>(() => parseInitialItems(preferences));
  const [saving, setSaving] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryTab, setLibraryTab] = useState<"metrics" | "chart">("metrics");
  const [metricSearch, setMetricSearch] = useState("");

  // ── Campaign state ─────────────────────────────────────────────────────────
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsError, setCampaignsError] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [campaignSelectorOpen, setCampaignSelectorOpen] = useState(false);
  const [campaignMetaData, setCampaignMetaData] = useState<MetaData | null>(null);
  const [campaignMetaLoading, setCampaignMetaLoading] = useState(false);

  // ── Custom date-range state (para comparar contra el Administrador de anuncios) ─
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customSince, setCustomSince] = useState("");
  const [customUntil, setCustomUntil] = useState("");
  const [customPresetLabel, setCustomPresetLabel] = useState<string | null>(null);
  const [customRangeData, setCustomRangeData] = useState<MetaData | null>(null);
  const [customRangeLoading, setCustomRangeLoading] = useState(false);
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

  const DATE_PRESETS = [
    { label: "Hoy",            days: 0,  single: true  },
    { label: "Ayer",           days: -1, single: true  },
    { label: "Últimos 7 días", days: 7,  single: false },
    { label: "Últimos 14d",    days: 14, single: false },
    { label: "Últimos 30d",    days: 30, single: false },
    { label: "Este mes",       days: -99, single: false },
    { label: "Mes anterior",   days: -98, single: false },
  ];

  function toISO(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  const applyPreset = async (preset: typeof DATE_PRESETS[0]) => {
    const today = new Date(); today.setHours(0,0,0,0);
    let since: Date, until: Date;
    if (preset.days === -99) { // Este mes
      since = new Date(today.getFullYear(), today.getMonth(), 1);
      until = today;
    } else if (preset.days === -98) { // Mes anterior
      since = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      until = new Date(today.getFullYear(), today.getMonth(), 0);
    } else if (preset.single) { // Hoy / Ayer
      const d = new Date(today); d.setDate(d.getDate() + preset.days);
      since = d; until = d;
    } else {
      since = new Date(today); since.setDate(since.getDate() - preset.days);
      until = today;
    }
    const s = toISO(since), u = toISO(until);
    setCustomSince(s); setCustomUntil(u);
    setCustomPresetLabel(preset.label);
    setCustomRangeOpen(false);
    setCustomRangeLoading(true); setCustomRangeError(null);
    try {
      const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : "";
      const res = await fetch(`/api/dashboard/meta-range?since=${s}&until=${u}${accountParam}`);
      const d = await res.json();
      if (d.error || d.message) { setCustomRangeError(d.error ?? d.message); setCustomRangeData(null); return; }
      const toNum = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0);
      setCustomRangeData({ spend: toNum(d.spend), reach: toNum(d.reach), impressions: toNum(d.impressions), clicks: toNum(d.clicks), linkClicks: toNum(d.linkClicks), outboundClicks: toNum(d.outboundClicks), landingPageViews: toNum(d.landingPageViews), leads: toNum(d.leads), purchases: toNum(d.purchases), purchaseValue: toNum(d.purchaseValue), ctr: toNum(d.ctr), cpc: toNum(d.cpc), cpm: toNum(d.cpm), frequency: toNum(d.frequency), videoViews: toNum(d.videoViews), videoP25: 0, videoP50: 0, videoP75: 0, videoP100: 0, postEngagement: toNum(d.postEngagement), postReactions: toNum(d.postReactions), postComments: toNum(d.postComments), postShares: toNum(d.postShares), messages: toNum(d.messages), cpl: toNum(d.cpl), roas: toNum(d.roas), costPerLandingPageView: toNum(d.costPerLandingPageView) });
    } catch { setCustomRangeError("Error al consultar Meta Ads."); setCustomRangeData(null); }
    finally { setCustomRangeLoading(false); }
  };

  const fetchCustomRange = async () => {
    if (!customSince || !customUntil) return;
    setCustomRangeLoading(true);
    setCustomRangeError(null);
    try {
      const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : "";
      const res = await fetch(`/api/dashboard/meta-range?since=${customSince}&until=${customUntil}${accountParam}`);
      const d = await res.json();
      if (d.error || d.message) {
        setCustomRangeError(d.error ?? d.message);
        setCustomRangeData(null);
        return;
      }
      const toNum = (v: unknown) => (typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0);
      setCustomRangeData({
        spend: toNum(d.spend), reach: toNum(d.reach), impressions: toNum(d.impressions), clicks: toNum(d.clicks),
        linkClicks: toNum(d.linkClicks), outboundClicks: toNum(d.outboundClicks), landingPageViews: toNum(d.landingPageViews),
        leads: toNum(d.leads), purchases: toNum(d.purchases), purchaseValue: toNum(d.purchaseValue),
        ctr: toNum(d.ctr), cpc: toNum(d.cpc), cpm: toNum(d.cpm), frequency: toNum(d.frequency),
        videoViews: toNum(d.videoViews), videoP25: 0, videoP50: 0, videoP75: 0, videoP100: 0,
        postEngagement: toNum(d.postEngagement), postReactions: toNum(d.postReactions),
        postComments: toNum(d.postComments), postShares: toNum(d.postShares),
        messages: toNum(d.messages),
        cpl: toNum(d.cpl), roas: toNum(d.roas), costPerLandingPageView: toNum(d.costPerLandingPageView),
      });
    } catch {
      setCustomRangeError("Error al consultar Meta Ads.");
      setCustomRangeData(null);
    } finally {
      setCustomRangeLoading(false);
    }
  };

  // ── Chart builder state ────────────────────────────────────────────────────
  const [chartMetrics, setChartMetrics] = useState<string[]>(["leads"]);
  const [chartPeriod, setChartPeriod] = useState<Period>("last_30d");
  const [chartType, setChartType] = useState<ChartType>("area");
  const [chartXAxis, setChartXAxis] = useState<XAxis>("day");

  // ── Grid width ─────────────────────────────────────────────────────────────
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridWidth, setGridWidth] = useState(1200);

  useEffect(() => {
    const update = () => { if (gridRef.current) setGridWidth(gridRef.current.offsetWidth); };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // ── Fetch campaigns ────────────────────────────────────────────────────────
  const loadCampaigns = () => {
    setCampaignsError(false);
    const accountParam = selectedAccountId ? `?account_id=${selectedAccountId}` : "";
    fetch(`/api/dashboard/campaigns${accountParam}`)
      .then((r) => { if (!r.ok) throw new Error("Error"); return r.json(); })
      .then((d) => setCampaigns(d.campaigns ?? []))
      .catch(() => setCampaignsError(true));
  };

  useEffect(() => {
    loadCampaigns();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId]);

  // ── Fetch campaign-level meta data when a campaign is selected ─────────────
  useEffect(() => {
    if (!selectedCampaign) {
      setCampaignMetaData(null);
      return;
    }
    setCampaignMetaLoading(true);

    const allMetrics = [
      "spend","reach","impressions","clicks","linkClicks","outboundClicks",
      "landingPageViews","leads","purchases","purchaseValue","ctr","cpc","cpm",
      "frequency","videoViews","postEngagement","postReactions","postComments",
      "postShares","messages","cpl","roas","costPerLandingPageView",
    ].join(",");

    fetch(`/api/dashboard/meta-chart?metrics=${allMetrics}&period=today&breakdown=account&campaign_id=${selectedCampaign.id}`)
      .then((r) => r.json())
      .then((d) => {
        const row = d.data?.[0];
        if (row) {
          const toNum = (v: unknown) => typeof v === "number" ? v : parseFloat(String(v ?? "0")) || 0;
          const md: MetaData = {
            spend: toNum(row.spend),
            reach: toNum(row.reach),
            impressions: toNum(row.impressions),
            clicks: toNum(row.clicks),
            linkClicks: toNum(row.linkClicks),
            outboundClicks: toNum(row.outboundClicks),
            landingPageViews: toNum(row.landingPageViews),
            leads: toNum(row.leads),
            purchases: toNum(row.purchases),
            purchaseValue: toNum(row.purchaseValue),
            ctr: toNum(row.ctr),
            cpc: toNum(row.cpc),
            cpm: toNum(row.cpm),
            frequency: toNum(row.frequency),
            videoViews: toNum(row.videoViews),
            videoP25: toNum(row.videoP25),
            videoP50: toNum(row.videoP50),
            videoP75: toNum(row.videoP75),
            videoP100: toNum(row.videoP100),
            postEngagement: toNum(row.postEngagement),
            postReactions: toNum(row.postReactions),
            postComments: toNum(row.postComments),
            postShares: toNum(row.postShares),
            messages: toNum(row.messages),
            cpl: toNum(row.cpl),
            roas: toNum(row.roas),
            costPerLandingPageView: toNum(row.costPerLandingPageView),
          };
          setCampaignMetaData(md);
        } else {
          setCampaignMetaData(null);
        }
      })
      .catch(() => setCampaignMetaData(null))
      .finally(() => setCampaignMetaLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCampaign?.id]);

  // ── Debounced save ─────────────────────────────────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSave = (newItems: DashboardItem[]) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        const res = await fetch("/api/company/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: newItems, dashboardConfigured: true }),
        });
        if (!res.ok) throw new Error("Error al guardar");
      } catch {
        showToast("No se pudo guardar la configuración del dashboard.", "error");
      } finally {
        setSaving(false);
      }
    }, 800);
  };

  // ── Item CRUD ──────────────────────────────────────────────────────────────
  const addItem = (newItem: DashboardItem) => {
    const updated = [...items, newItem];
    setItems(updated);
    debouncedSave(updated);
    setLibraryOpen(false);
  };

  const removeItem = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    debouncedSave(updated);
  };

  const updateItemPeriod = (id: string, period: Period) => {
    const updated = items.map((i) => i.id === id ? { ...i, period } : i);
    setItems(updated);
    debouncedSave(updated);
  };

  // ── ALU.IA panel state ─────────────────────────────────────────────────────
  const [aluIaOpen, setAluIaOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [aluMode, setAluMode] = useState<AluMode>("idle");

  // ── Daily chart data (for AriClaro-style charts) ───────────────────────────
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [dailyLoading, setDailyLoading] = useState(true);

  useEffect(() => {
    setDailyLoading(true);
    const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : "";
    // Si hay período seleccionado usa since/until, si no usa last_30d
    const dateParam = customSince && customUntil
      ? `since=${customSince}&until=${customUntil}`
      : `period=last_30d`;
    fetch(`/api/dashboard/meta-chart?metrics=leads,spend,cpl,messages,purchases&${dateParam}&breakdown=day${accountParam}`)
      .then((r) => r.json())
      .then((d) => {
        const rows = d.data ?? [];
        let cumL = 0, cumM = 0, cumP = 0;
        setDailyData(rows.map((r: any) => ({
          label: r.label,
          leads: r.leads ?? 0, spend: r.spend ?? 0, cpl: r.cpl ?? 0,
          messages: r.messages ?? 0, purchases: r.purchases ?? 0,
          cumLeads:    (cumL += (r.leads    ?? 0)),
          cumMessages: (cumM += (r.messages ?? 0)),
          cumPurchases:(cumP += (r.purchases?? 0)),
        })));
      })
      .catch(() => {})
      .finally(() => setDailyLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccountId, customSince, customUntil]);

  // Tipo de campaña: auto-detectado del mes, o elegido manualmente por el usuario
  const [selectedCampaignType, setSelectedCampaignType] = useState<"leads"|"messages"|"sales"|null>(null);

  const autoCampaignType: "leads" | "messages" | "sales" =
    (metaMonthly?.purchases ?? 0) > 0 ? "sales"
    : (metaMonthly?.messages ?? 0) > (metaMonthly?.leads ?? 0) * 2 ? "messages"
    : "leads";

  const campaignType = selectedCampaignType ?? autoCampaignType;

  const CAMPAIGN_TYPES = [
    { id: "leads" as const,    label: "Leads",    icon: "🎯", color: "#7c3aed", heroIcon: "#7c3aed" },
    { id: "messages" as const, label: "Mensajes", icon: "💬", color: "#0ea5e9", heroIcon: "#0ea5e9" },
    { id: "sales" as const,    label: "Ventas",   icon: "🛒", color: "#10b981", heroIcon: "#10b981" },
  ];

  // Cuando hay período seleccionado, usar esos datos en todas las métricas y gráficos
  const activeData = customRangeData ?? metaToday;
  const periodLabel = customPresetLabel ?? (customRangeData ? `${customSince} → ${customUntil}` : "HOY");

  const heroMetrics = {
    leads:    { label: "Leads",    value: activeData?.leads    ?? 0, monthValue: (customRangeData ?? metaMonthly)?.leads    ?? 0, fmt: (v: number) => v.toLocaleString("es-PE"), icon: "🎯", color: "#7c3aed", cumKey: "cumLeads",     barKey: "leads" },
    messages: { label: "Mensajes", value: activeData?.messages ?? 0, monthValue: (customRangeData ?? metaMonthly)?.messages ?? 0, fmt: (v: number) => v.toLocaleString("es-PE"), icon: "💬", color: "#0ea5e9", cumKey: "cumMessages",  barKey: "messages" },
    sales:    { label: "Compras",  value: activeData?.purchases?? 0, monthValue: (customRangeData ?? metaMonthly)?.purchases?? 0, fmt: (v: number) => v.toLocaleString("es-PE"), icon: "🛒", color: "#10b981", cumKey: "cumPurchases", barKey: "purchases" },
  }[campaignType];

  const costMetric = {
    leads:    { label: "CPL",      value: activeData?.cpl ?? 0, monthValue: (customRangeData ?? metaMonthly)?.cpl ?? 0, fmt: (v: number) => `S/ ${v.toFixed(2)}`, lineKey: "cpl" },
    messages: { label: "Costo/Msg",value: activeData?.messages ? (activeData?.spend ?? 0) / activeData.messages : 0, monthValue: customRangeData?.messages ? (customRangeData?.spend ?? 0) / customRangeData.messages : (metaMonthly?.messages ? (metaMonthly?.spend ?? 0) / metaMonthly.messages : 0), fmt: (v: number) => `S/ ${v.toFixed(2)}`, lineKey: "cpl" },
    sales:    { label: "ROAS",     value: activeData?.roas ?? 0, monthValue: (customRangeData ?? metaMonthly)?.roas ?? 0, fmt: (v: number) => `${v.toFixed(2)}x`, lineKey: "cpl" },
  }[campaignType];
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Onboarding state ──────────────────────────────────────────────────────
  const [isOnboarding, setIsOnboarding] = useState(!dashboardConfigured);
  const [onboardingContext, setOnboardingContext] = useState<string>("");
  const [configuredAnimation, setConfiguredAnimation] = useState(false);

  // ── Date / time ────────────────────────────────────────────────────────────
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
      const timeStr = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
      setCurrentDateTime(`${dateStr} · ${timeStr}`);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  // ── Auto-scroll chat ───────────────────────────────────────────────────────
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // ── Clean chat content ─────────────────────────────────────────────────────
  const cleanContent = (text: string) =>
    text
      .replace(/\[WIDGET:[a-z_]+\]/g, "")
      .replace(/\[HIDE:[a-z_]+\]/g, "")
      .replace(/\[ORDER:[a-z_,]+\]/g, "")
      .replace(/\[GOAL:[a-z_]+\]/g, "")
      .replace(/\[CONFIGURED\]/g, "")
      .replace(/\[[A-Z]+:?[a-z_,]*$/, "")
      .trimEnd();

  // ── handleConfigured ───────────────────────────────────────────────────────
  const handleConfigured = async () => {
    await fetch("/api/company/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dashboardConfigured: true }),
    });
    setConfiguredAnimation(true);
    setIsOnboarding(false);
    setTimeout(() => setConfiguredAnimation(false), 4000);
  };

  // ── applyCommands ──────────────────────────────────────────────────────────
  const applyCommands = (reply: string) => {
    const goalMatch = reply.match(/\[GOAL:([a-z_]+)\]/);
    if (goalMatch) {
      fetch("/api/company/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalMatch[1] }),
      }).catch(() => {});
    }
    if (reply.includes("[CONFIGURED]")) {
      handleConfigured();
    }
  };

  // ── sendOnboardingGreeting ─────────────────────────────────────────────────
  const sendOnboardingGreeting = async (contextSummary: string) => {
    setChatLoading(true);
    setChatMessages([{ role: "assistant", content: "" }]);
    try {
      const res = await fetch("/api/alu-ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Inicia el flujo de configuración del dashboard. Turno 1.",
          context: "onboarding",
          onboardingContext: contextSummary,
        }),
      });
      if (!res.ok || !res.body) {
        setChatMessages([{ role: "assistant", content: "Hola, soy ALU.IA. ¿En qué puedo ayudarte?" }]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content || "";
            fullReply += content;
            setChatMessages([{ role: "assistant", content: fullReply }]);
          } catch { /* ignore */ }
        }
      }
      applyCommands(fullReply);
    } catch {
      setChatMessages([{ role: "assistant", content: "Hola, soy ALU.IA. ¿En qué puedo ayudarte?" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── Auto-open onboarding on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!dashboardConfigured) {
      setAluIaOpen(true);
      fetch("/api/dashboard/context")
        .then((r) => r.json())
        .then((data) => {
          setOnboardingContext(data.summary || "");
          sendOnboardingGreeting(data.summary || "");
        })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── sendMessage ────────────────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    if (!text.trim() || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: "user", content: text }]);
    setChatInput("");
    setChatLoading(true);
    setAluMode("thinking");
    setChatMessages((prev) => [...prev, { role: "assistant", content: "" }]);
    try {
      const bodyPayload: Record<string, unknown> = { message: text, context: "dashboard", stats };
      if (isOnboarding) {
        bodyPayload.context = "onboarding";
        bodyPayload.onboardingContext = onboardingContext;
      }
      const res = await fetch("/api/alu-ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok || !res.body) {
        setChatMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: "Error al conectar con ALU.IA. Intenta de nuevo." },
        ]);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullReply = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices?.[0]?.delta?.content || "";
            fullReply += content;
            setChatMessages((prev) => [
              ...prev.slice(0, -1),
              { role: "assistant", content: fullReply },
            ]);
          } catch { /* ignore */ }
        }
      }
      applyCommands(fullReply);
      setAluMode("responding");
      setTimeout(() => setAluMode("idle"), 600);
    } catch {
      setChatMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Error al conectar con ALU.IA. Intenta de nuevo." },
      ]);
      setAluMode("idle");
    } finally {
      setChatLoading(false);
    }
  };

  const handleChatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(chatInput);
    }
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  // When a campaign is selected, use its specific data for metric cards
  // When no campaign selected, use server-fetched account-level data
  const effectiveMetaToday = selectedCampaign ? campaignMetaData : metaToday;
  const effectiveMetaYesterday = selectedCampaign ? null : metaYesterday;

  const filteredMetrics = METRIC_CATALOG.filter(
    (m) =>
      !metricSearch ||
      m.label.toLowerCase().includes(metricSearch.toLowerCase()) ||
      m.description.toLowerCase().includes(metricSearch.toLowerCase())
  );
  const sortedMetrics = selectedCampaign
    ? [...filteredMetrics].sort((a, b) => {
        const aRel = selectedCampaign.relevantMetrics.includes(a.id) ? -1 : 1;
        const bRel = selectedCampaign.relevantMetrics.includes(b.id) ? -1 : 1;
        return aRel - bRel;
      })
    : filteredMetrics;
  const groups = Array.from(new Set(sortedMetrics.map((m) => m.group)));

  const layout = items.map((item) => ({
    i: item.id,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.type === "chart" || item.type === "campaign_comparison" ? 4 : 2,
    minH: item.type === "chart" || item.type === "campaign_comparison" ? 3 : 2,
  }));

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Global animations ── */}
      <style>{ALU_CHARACTER_STYLES}</style>
      <style>{`
        @keyframes cardPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(114,85,180,0.2); }
          50%       { box-shadow: 0 0 36px rgba(114,85,180,0.45); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes celebrationFadeOut {
          0%   { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
        .react-grid-item.react-grid-placeholder {
          background: rgba(114,85,180,0.15) !important;
          border: 2px dashed rgba(114,85,180,0.4) !important;
          border-radius: 22px !important;
          opacity: 1 !important;
        }
        .react-resizable-handle {
          opacity: 0;
          transition: opacity 0.15s;
        }
        .react-grid-item:hover .react-resizable-handle {
          opacity: 0.5;
        }
        .drag-handle { cursor: grab; }
        .drag-handle:active { cursor: grabbing; }
        .dashboard-card {
          transition: transform 0.4s cubic-bezier(0.23,1,0.32,1), box-shadow 0.4s cubic-bezier(0.23,1,0.32,1);
        }
        .dashboard-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 24px 48px -12px rgba(30,11,66,0.12), 0 12px 24px -8px rgba(0,0,0,0.06) !important;
        }
      `}</style>

      {/* ── Celebration overlay ── */}
      {configuredAnimation && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: "var(--color-surface-glass)",
          animation: "celebrationFadeOut 4s ease forwards",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
          <h2 style={{ color: "var(--color-text-primary)", fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
            ¡Tu dashboard está listo!
          </h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 14, textAlign: "center", maxWidth: 320 }}>
            ALU.IA configuró tu vista personalizada basándose en tu negocio.
          </p>
          <div style={{
            marginTop: 20, padding: "8px 20px", borderRadius: 20,
            background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
            color: "#fff", fontSize: 13, fontWeight: 600,
          }}>
            Dashboard configurado ✓
          </div>
        </div>
      )}

      {/* ── Library backdrop ── */}
      {libraryOpen && (
        <div
          onClick={() => setLibraryOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 49,
            background: "rgba(0,0,0,0.45)",
            animation: "fadeIn 0.2s ease",
          }}
        />
      )}

      {/* ── Library panel ── */}
      {libraryOpen && (
        <div style={{
          position: "fixed", top: 0, right: 0, height: "100vh", width: 380, zIndex: 50,
          background: "var(--color-surface-2)", borderLeft: "1px solid rgba(114,85,180,0.25)",
          display: "flex", flexDirection: "column",
          animation: "slideInRight 0.2s ease",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
        }}>
          {/* Panel header */}
          <div style={{
            padding: "18px 20px", borderBottom: "1px solid rgba(114,85,180,0.2)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexShrink: 0,
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>Agregar al dashboard</div>
              <div style={{ fontSize: 11, color: "var(--color-text-faint)", marginTop: 2 }}>Métricas · Gráficos personalizados</div>
            </div>
            <button
              onClick={() => setLibraryOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)" }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(114,85,180,0.15)", flexShrink: 0 }}>
            {(["metrics", "chart"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setLibraryTab(tab)}
                style={{
                  flex: 1, padding: "10px 0", border: "none", cursor: "pointer",
                  background: libraryTab === tab ? "rgba(114,85,180,0.12)" : "transparent",
                  color: libraryTab === tab ? "var(--color-text-primary)" : "var(--color-text-muted)",
                  fontSize: 12, fontWeight: libraryTab === tab ? 700 : 400,
                  borderBottom: libraryTab === tab ? "2px solid var(--color-lavender)" : "2px solid transparent",
                  transition: "all 0.15s",
                }}
              >
                {tab === "metrics" ? "Métricas" : "Gráfico"}
              </button>
            ))}
          </div>

          {/* Tab: Métricas */}
          {libraryTab === "metrics" && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
              {/* Search */}
              <div style={{ padding: "12px 16px", flexShrink: 0 }}>
                <input
                  value={metricSearch}
                  onChange={(e) => setMetricSearch(e.target.value)}
                  placeholder="Buscar métrica..."
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(114,85,180,0.25)",
                    borderRadius: 8, padding: "8px 12px", color: "var(--color-text-primary)", fontSize: 12,
                    outline: "none",
                  }}
                />
              </div>

              {/* Grouped metrics */}
              <div style={{ padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
                {groups.map((group) => (
                  <div key={group}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                      {group}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {sortedMetrics.filter((m) => m.group === group).map((metric) => {
                        const isRelevant = selectedCampaign && selectedCampaign.relevantMetrics.includes(metric.id);
                        return (
                          <div
                            key={metric.id}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              padding: "10px 12px",
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(114,85,180,0.12)",
                              borderRadius: 10, gap: 10,
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 16, flexShrink: 0 }}>{metric.icon}</span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center" }}>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: metric.color }}>{metric.label}</div>
                                  {isRelevant && (
                                    <span style={{
                                      fontSize: 9, fontWeight: 700, color: "var(--color-lavender)",
                                      background: "rgba(114,85,180,0.15)", padding: "1px 5px",
                                      borderRadius: 4, marginLeft: 4,
                                    }}>
                                      ⭐ Recomendada
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {metric.description}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                const newItem: DashboardItem = {
                                  id: `${metric.id}-${Date.now()}`,
                                  type: "metric_card",
                                  metric: metric.id,
                                  period: "today",
                                  x: 0, y: Infinity, w: 3, h: 2,
                                };
                                addItem(newItem);
                              }}
                              style={{
                                flexShrink: 0, padding: "5px 12px", borderRadius: 7,
                                border: "none", cursor: "pointer",
                                background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                                color: "#fff", fontSize: 11, fontWeight: 600,
                                whiteSpace: "nowrap",
                              }}
                            >
                              + Agregar
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab: Gráfico */}
          {libraryTab === "chart" && (
            <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Quick add: Campaign Comparison */}
              <div style={{
                padding: "12px 14px", border: "1px solid rgba(114,85,180,0.2)",
                borderRadius: 12, background: "rgba(255,255,255,0.02)", marginBottom: 8,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>📊 Comparativa de campañas</div>
                <div style={{ fontSize: 11, color: "var(--color-text-faint)", marginBottom: 10 }}>
                  Todas tus campañas activas con su resultado según objetivo: leads, clics, alcance, compras.
                </div>
                <button
                  onClick={() => {
                    addItem({
                      id: `campaign_comparison-${Date.now()}`,
                      type: "campaign_comparison",
                      period: "last_30d",
                      x: 0, y: Infinity, w: 12, h: 4,
                    });
                  }}
                  style={{
                    background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                    border: "none", borderRadius: 8, padding: "7px 16px",
                    color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
                  }}
                >
                  + Agregar comparativa
                </button>
              </div>

              {/* Quick add: Funnel */}
              <div style={{
                padding: "12px 14px", border: "1px solid rgba(114,85,180,0.2)",
                borderRadius: 12, background: "rgba(255,255,255,0.02)", marginBottom: 0,
              }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 4 }}>🔻 Embudo de conversión</div>
                <div style={{ fontSize: 11, color: "var(--color-text-faint)", marginBottom: 10 }}>
                  Visualiza Impresiones → Clics → Visitas → Leads. Se adapta al objetivo de la campaña seleccionada.
                </div>
                <button
                  onClick={() => {
                    addItem({
                      id: `funnel-${Date.now()}`,
                      type: "funnel",
                      period: "today",
                      x: 0, y: Infinity, w: 6, h: 4,
                    });
                  }}
                  style={{
                    background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                    border: "none", borderRadius: 8, padding: "7px 16px",
                    color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", width: "100%",
                  }}
                >
                  + Agregar embudo
                </button>
              </div>

              {/* Período */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>Período</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["last_7d", "last_30d"] as Period[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => setChartPeriod(p)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: chartPeriod === p ? "var(--color-lavender)" : "rgba(255,255,255,0.06)",
                        color: chartPeriod === p ? "#fff" : "var(--color-text-secondary)", fontSize: 12,
                      }}
                    >
                      {p === "last_7d" ? "7 días" : "30 días"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tipo de gráfico */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>Tipo de gráfico</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["area", "line", "bar"] as ChartType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setChartType(t)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: chartType === t ? "var(--color-lavender)" : "rgba(255,255,255,0.06)",
                        color: chartType === t ? "#fff" : "var(--color-text-secondary)", fontSize: 12,
                      }}
                    >
                      {t === "area" ? "Área" : t === "line" ? "Línea" : "Barras"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agrupar por */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>Agrupar por</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["day", "campaign", "adset"] as XAxis[]).map((x) => (
                    <button
                      key={x}
                      onClick={() => setChartXAxis(x)}
                      style={{
                        padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                        background: chartXAxis === x ? "var(--color-lavender)" : "rgba(255,255,255,0.06)",
                        color: chartXAxis === x ? "#fff" : "var(--color-text-secondary)", fontSize: 12,
                      }}
                    >
                      {x === "day" ? "Por día" : x === "campaign" ? "Por campaña" : "Por conjunto"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Métricas (max 3) */}
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 6 }}>
                  Métricas <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(máx 3)</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {METRIC_CATALOG.slice(0, 12).map((m) => {
                    const active = chartMetrics.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "5px 0" }}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => {
                            if (active) {
                              setChartMetrics((prev) => prev.filter((id) => id !== m.id));
                            } else if (chartMetrics.length < 3) {
                              setChartMetrics((prev) => [...prev, m.id]);
                            }
                          }}
                          style={{ accentColor: m.color }}
                        />
                        <span style={{ fontSize: 12, color: active ? m.color : "var(--color-text-secondary)" }}>
                          {m.icon} {m.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Crear gráfico */}
              <button
                onClick={() => {
                  const newChart: DashboardItem = {
                    id: `chart-${Date.now()}`,
                    type: "chart",
                    metrics: chartMetrics,
                    xAxis: chartXAxis,
                    chartType,
                    period: chartPeriod,
                    x: 0, y: Infinity, w: 8, h: 5,
                  };
                  addItem(newChart);
                }}
                disabled={chartMetrics.length === 0}
                style={{
                  background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                  border: "none", borderRadius: 10, padding: "12px 0",
                  color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  opacity: chartMetrics.length === 0 ? 0.5 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                Crear gráfico
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ALU.IA panel ── */}
      {aluIaOpen && (
        <div style={{
          position: "fixed", top: 0, right: 0, height: "100vh", width: 380, zIndex: 100,
          background: "var(--color-surface-1)", borderLeft: "1px solid rgba(114,85,180,0.3)",
          display: "flex", flexDirection: "column",
          animation: "slideInRight 0.25s ease",
          boxShadow: "-8px 0 40px rgba(0,0,0,0.5)",
        }}>
          {/* Panel header */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "18px 20px", borderBottom: "1px solid rgba(114,85,180,0.2)",
            background: "linear-gradient(135deg,rgba(43,9,111,0.4),rgba(114,85,180,0.15))",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AluAvatar size={32} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>ALU.IA Dashboard</div>
                <div style={{ fontSize: 10.5, color: "var(--color-lavender)" }}>Asistente de métricas</div>
              </div>
            </div>
            <button
              onClick={() => setAluIaOpen(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-faint)", padding: 4 }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Context banner */}
          <div style={{
            margin: "12px 16px 0", padding: "10px 13px",
            background: isOnboarding ? "rgba(114,85,180,0.1)" : "rgba(43,9,111,0.2)",
            border: isOnboarding ? "1px solid rgba(114,85,180,0.3)" : "1px solid rgba(114,85,180,0.25)",
            borderRadius: 10, flexShrink: 0,
          }}>
            <p style={{ fontSize: 11.5, color: "var(--color-text-secondary)", margin: 0, lineHeight: 1.55 }}>
              {isOnboarding
                ? "🚀 Configurando tu dashboard personalizado..."
                : "Tengo acceso a tus métricas actuales. Puedo ayudarte a interpretar datos e identificar oportunidades."}
            </p>
          </div>

          {/* Chat area */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {chatMessages.length === 0 && (
              <div style={{ textAlign: "center", padding: "20px 0", color: "var(--color-text-muted)", fontSize: 12 }}>
                {isOnboarding ? "Iniciando configuración..." : "Haz una pregunta a ALU.IA."}
              </div>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} style={{ display: "flex", gap: 8, justifyContent: msg.role === "user" ? "flex-end" : "flex-start" }}>
                {msg.role === "assistant" && <AluAvatar size={28} />}
                <div style={{
                  maxWidth: "78%", padding: "9px 13px", borderRadius: 12,
                  background: msg.role === "user"
                    ? "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))"
                    : "rgba(255,255,255,0.06)",
                  border: msg.role === "assistant" ? "1px solid rgba(114,85,180,0.2)" : "none",
                  fontSize: 12.5, color: "var(--color-text-primary)", lineHeight: 1.55,
                  borderBottomRightRadius: msg.role === "user" ? 4 : 12,
                  borderBottomLeftRadius: msg.role === "assistant" ? 4 : 12,
                  whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {cleanContent(msg.content)}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-start" }}>
                <AluAvatar size={28} />
                <div style={{
                  padding: "9px 13px", borderRadius: 12, borderBottomLeftRadius: 4,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(114,85,180,0.2)",
                  fontSize: 12, color: "var(--color-lavender)", fontStyle: "italic",
                }}>
                  ALU.IA está pensando...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(114,85,180,0.2)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={handleChatKeyDown}
              placeholder="Escribe tu pregunta..."
              disabled={chatLoading}
              style={{
                flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(114,85,180,0.25)",
                borderRadius: 10, padding: "9px 13px", color: "var(--color-text-primary)", fontSize: 12.5, outline: "none",
              }}
            />
            <button
              onClick={() => sendMessage(chatInput)}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, opacity: chatLoading || !chatInput.trim() ? 0.4 : 1,
              }}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}

      {/* ── ALU.IA floating button ── */}
      {!aluIaOpen && (
        <button
          onClick={() => setAluIaOpen(true)}
          title="Hablar con ALU.IA"
          style={{
            position: "fixed", bottom: 16, right: 16, zIndex: 99,
            border: "none", background: "none", cursor: "pointer", padding: 0,
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.06)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
        >
          <AluCharacter size={64} mode={aluMode} />
        </button>
      )}

      {/* ── "+" floating button ── */}
      <button
        onClick={() => setLibraryOpen(true)}
        style={{
          position: "fixed", bottom: 88, right: 24, zIndex: 90,
          width: 48, height: 48, borderRadius: 24,
          background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
          border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(114,85,180,0.5)",
          color: "#fff", fontSize: 22, fontWeight: 300,
          transition: "transform 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 28px rgba(114,85,180,0.7)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 20px rgba(114,85,180,0.5)";
        }}
        title="Agregar métrica o gráfico"
      >
        +
      </button>

      {/* ── Main content ── */}
      <div style={{
        padding: "24px",
        background: "radial-gradient(at 0% 0%, rgba(139,92,246,0.04) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(139,92,246,0.03) 0px, transparent 50%)",
        minHeight: "100%",
      }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 24,
        }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1e0b42", margin: 0, letterSpacing: "-0.04em" }}>
              Dashboard de Resultados
            </h1>
            <p style={{ fontSize: 13, color: "#64748b", margin: "3px 0 0", fontWeight: 500 }}>
              {companyName || userName.split(" ")[0]} · {currentDateTime || " "}
            </p>
            {/* ── Selector de tipo de campaña ── */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>Ver métricas de:</span>
              {CAMPAIGN_TYPES.map((t) => {
                const isActive = campaignType === t.id;
                const isAuto = selectedCampaignType === null && autoCampaignType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedCampaignType(selectedCampaignType === t.id ? null : t.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "5px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                      fontSize: 11.5, fontWeight: isActive ? 700 : 500,
                      background: isActive ? t.color : "rgba(226,232,240,0.6)",
                      color: isActive ? "#fff" : "#64748b",
                      boxShadow: isActive ? `0 4px 12px -2px ${t.color}50` : "none",
                      transition: "all 0.2s cubic-bezier(0.23,1,0.32,1)",
                    }}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                    {isAuto && !isActive && (
                      <span style={{ fontSize: 9, background: "rgba(0,0,0,0.08)", padding: "1px 5px", borderRadius: 10, marginLeft: 2 }}>auto</span>
                    )}
                    {isAuto && isActive && (
                      <span style={{ fontSize: 9, background: "rgba(255,255,255,0.2)", padding: "1px 5px", borderRadius: 10, marginLeft: 2 }}>auto</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
          <Link
            href="/alu-ia"
            style={{
              display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
              background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
              borderRadius: 10, textDecoration: "none",
              fontSize: 13, fontWeight: 600, color: "#fff",
              boxShadow: "0 4px 16px rgba(43,9,111,0.35)",
            }}
          >
            <Zap size={14} />
            ALU.IA
            {stats.alerts > 0 && (
              <span style={{
                background: "var(--color-coral)", color: "#fff", fontSize: 10,
                fontWeight: 700, padding: "1px 6px", borderRadius: 20,
              }}>
                {stats.alerts}
              </span>
            )}
          </Link>
        </div>

        {/* ── Dashboard top bar ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, padding: "0 4px" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#1e0b42" }}>Mi Dashboard</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, fontWeight: 500 }}>Arrastra · Redimensiona · Personaliza</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {saving && <span style={{ fontSize: 10.5, color: "var(--color-lavender)" }}>Guardando...</span>}
            {campaignMetaLoading && (
              <span style={{ fontSize: 10.5, color: "var(--color-lavender)" }}>Cargando campaña...</span>
            )}
            {metaSummaryLoading && (
              <span style={{ fontSize: 10.5, color: "var(--color-lavender)" }}>Cargando cuenta...</span>
            )}

            {/* Account filter (solo si hay 2+ cuentas de Meta) */}
            {metaAccounts.length > 1 && (
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setAccountSelectorOpen((v) => !v)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: selectedAccountId ? "rgba(114,85,180,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${selectedAccountId ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.2)"}`,
                    borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                    color: selectedAccountId ? "var(--color-text-primary)" : "var(--color-text-faint)", fontSize: 12,
                  }}
                >
                  <span>🏢</span>
                  <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedAccountId
                      ? (metaAccounts.find((a) => a.accountId === selectedAccountId)?.label || selectedAccountId)
                      : "Todas las cuentas"}
                  </span>
                  <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>▼</span>
                </button>

                {accountSelectorOpen && (
                  <>
                    <div onClick={() => setAccountSelectorOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} />
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 60,
                      background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)",
                      borderRadius: 12, padding: 8, minWidth: 220,
                      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxHeight: 320, overflowY: "auto",
                    }}>
                      <button
                        onClick={() => { setSelectedAccountId(null); setAccountSelectorOpen(false); }}
                        style={{
                          width: "100%", textAlign: "left", padding: "8px 10px",
                          background: !selectedAccountId ? "rgba(114,85,180,0.15)" : "none",
                          border: "none", borderRadius: 8, cursor: "pointer",
                          color: !selectedAccountId ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontSize: 12, marginBottom: 4,
                        }}
                      >
                        <span>🏢</span> <strong>Todas las cuentas</strong>
                        <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1, paddingLeft: 18 }}>Combinadas</div>
                      </button>
                      {metaAccounts.map((a) => (
                        <button
                          key={a.accountId}
                          onClick={() => { setSelectedAccountId(a.accountId); setAccountSelectorOpen(false); }}
                          style={{
                            width: "100%", textAlign: "left", padding: "8px 10px",
                            background: selectedAccountId === a.accountId ? "rgba(114,85,180,0.15)" : "none",
                            border: "none", borderRadius: 8, cursor: "pointer",
                            color: "var(--color-text-secondary)", fontSize: 12, marginBottom: 2,
                          }}
                        >
                          <div style={{ color: "var(--color-text-primary)" }}>{a.label || a.accountId}</div>
                          <div style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>{a.accountId}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Campaign filter */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setCampaignSelectorOpen((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: selectedCampaign ? "rgba(114,85,180,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${selectedCampaign ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.2)"}`,
                  borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                  color: selectedCampaign ? "var(--color-text-primary)" : "var(--color-text-faint)", fontSize: 12,
                }}
              >
                <span>📣</span>
                <span style={{ maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedCampaign ? selectedCampaign.name : "Todas las campañas"}
                </span>
                <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>▼</span>
              </button>

              {campaignSelectorOpen && (
                <>
                  <div onClick={() => setCampaignSelectorOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 60,
                    background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)",
                    borderRadius: 12, padding: 8, minWidth: 280,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)", maxHeight: 320, overflowY: "auto",
                  }}>
                    {/* All campaigns option */}
                    <button
                      onClick={() => { setSelectedCampaign(null); setCampaignSelectorOpen(false); }}
                      style={{
                        width: "100%", textAlign: "left", padding: "8px 10px",
                        background: !selectedCampaign ? "rgba(114,85,180,0.15)" : "none",
                        border: "none", borderRadius: 8, cursor: "pointer",
                        color: !selectedCampaign ? "var(--color-text-primary)" : "var(--color-text-secondary)", fontSize: 12, marginBottom: 4,
                      }}
                    >
                      <span>📊</span> <strong>Todas las campañas</strong>
                      <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 1, paddingLeft: 18 }}>Totales de la cuenta</div>
                    </button>

                    {campaigns.length === 0 && (
                      <div style={{ padding: "8px 10px", color: "var(--color-text-muted)", fontSize: 11 }}>Sin campañas activas</div>
                    )}

                    {campaigns.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => { setSelectedCampaign(c); setCampaignSelectorOpen(false); }}
                        style={{
                          width: "100%", textAlign: "left", padding: "8px 10px",
                          background: selectedCampaign?.id === c.id ? "rgba(114,85,180,0.15)" : "none",
                          border: "none", borderRadius: 8, cursor: "pointer",
                          color: "var(--color-text-secondary)", fontSize: 12, marginBottom: 2,
                          transition: "background 0.1s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedCampaign?.id === c.id ? "rgba(114,85,180,0.15)" : "none")}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                            <div style={{ fontSize: 10.5, color: "var(--color-lavender)", marginTop: 2 }}>{c.objectiveLabel}</div>
                          </div>
                          <div style={{ flexShrink: 0, textAlign: "right", fontSize: 10.5, color: "var(--color-text-muted)", marginLeft: 8 }}>
                            {c.leads30d > 0 ? `${c.leads30d} leads` : `S/ ${c.spend30d.toFixed(0)}`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Custom date range — Meta-style picker */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setCustomRangeOpen((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: customRangeData ? "rgba(114,85,180,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${customRangeData ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.2)"}`,
                  borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                  color: customRangeData ? "var(--color-text-primary)" : "var(--color-text-faint)", fontSize: 12,
                }}
              >
                <span>📅</span>
                <span>
                  {customRangeLoading ? "Cargando..." : customPresetLabel ?? (customRangeData ? `${customSince} → ${customUntil}` : "Período personalizado")}
                </span>
                <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>▼</span>
              </button>

              {customRangeOpen && (
                <>
                  <div onClick={() => setCustomRangeOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} />
                  <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 60 }}>
                    <DateRangeCalendar
                      presets={DATE_PRESETS}
                      activeLabel={customPresetLabel}
                      onPresetApply={(p) => applyPreset(p)}
                      onApply={(since, until, label) => {
                        setCustomSince(since); setCustomUntil(until);
                        setCustomPresetLabel(label);
                        setCustomRangeOpen(false);
                        fetchCustomRange();
                      }}
                      onClose={() => setCustomRangeOpen(false)}
                      onClear={customRangeData ? () => {
                        setCustomRangeData(null); setCustomRangeError(null);
                        setCustomPresetLabel(null); setCustomSince(""); setCustomUntil("");
                        setCustomRangeOpen(false);
                      } : undefined}
                    />
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => { setItems(DEFAULT_ITEMS); debouncedSave(DEFAULT_ITEMS); }}
              style={{
                background: "none", border: "1px solid rgba(114,85,180,0.3)",
                borderRadius: 8, padding: "5px 12px", cursor: "pointer",
                color: "var(--color-text-faint)", fontSize: 11.5,
              }}
            >
              Restablecer
            </button>
          </div>
        </div>

        {/* ── Custom range result card ── */}
        {(customRangeError || customRangeData) && (
          <div style={{
            display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap",
            padding: "14px 18px", borderRadius: 12, marginBottom: 16,
            background: "rgba(114,85,180,0.08)", border: "1px solid rgba(114,85,180,0.25)",
          }}>
            {customRangeError ? (
              <span style={{ fontSize: 12.5, color: "var(--color-text-muted)" }}>{customRangeError}</span>
            ) : customRangeData && (
              <>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-lavender)" }}>
                  {customSince} → {customUntil}
                </span>
                {[
                  { label: "Gasto", value: `S/ ${customRangeData.spend.toFixed(2)}` },
                  { label: "Leads", value: customRangeData.leads.toLocaleString("es-PE") },
                  { label: "CPL", value: `S/ ${customRangeData.cpl.toFixed(2)}` },
                  { label: "CTR", value: `${customRangeData.ctr.toFixed(2)}%` },
                  { label: "Clics", value: customRangeData.clicks.toLocaleString("es-PE") },
                  { label: "Alcance", value: customRangeData.reach.toLocaleString("es-PE") },
                ].map((m) => (
                  <div key={m.label} style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 10, color: "var(--color-text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{m.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{m.value}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Computed insights ── */}
        {effectiveMetaToday && (() => {
          const insights: { text: string; color: string; icon: string }[] = [];

          // CPL insight
          if (effectiveMetaToday.cpl > 0 && effectiveMetaYesterday?.cpl && effectiveMetaYesterday.cpl > 0) {
            const cplChange = ((effectiveMetaToday.cpl - effectiveMetaYesterday.cpl) / effectiveMetaYesterday.cpl) * 100;
            if (Math.abs(cplChange) > 10) {
              insights.push({
                text: cplChange > 0
                  ? `CPL subió ${cplChange.toFixed(0)}% vs ayer (S/ ${effectiveMetaToday.cpl.toFixed(2)})`
                  : `CPL bajó ${Math.abs(cplChange).toFixed(0)}% vs ayer (S/ ${effectiveMetaToday.cpl.toFixed(2)}) ✓`,
                color: cplChange > 0 ? "var(--color-coral)" : "var(--color-success)",
                icon: cplChange > 0 ? "⚠️" : "✅",
              });
            }
          }

          // Frequency insight
          if (effectiveMetaToday.frequency > 3.5) {
            insights.push({
              text: `Frecuencia alta: ${effectiveMetaToday.frequency.toFixed(1)}x — considera renovar creativos`,
              color: "var(--color-warning)",
              icon: "🔄",
            });
          }

          // CTR insight
          if (effectiveMetaToday.impressions > 1000 && effectiveMetaToday.ctr < 0.5) {
            insights.push({
              text: `CTR bajo (${effectiveMetaToday.ctr.toFixed(2)}%) — el anuncio podría mejorar`,
              color: "var(--color-warning)",
              icon: "📉",
            });
          } else if (effectiveMetaToday.ctr > 3) {
            insights.push({
              text: `CTR excelente: ${effectiveMetaToday.ctr.toFixed(2)}% — anuncio de alto rendimiento`,
              color: "var(--color-success)",
              icon: "🔥",
            });
          }

          // Mixed objectives banner when campaign is selected but has no data for primary result type
          if (selectedCampaign && campaignMetaData) {
            const category = selectedCampaign.category;
            const hasNoExpectedData = (
              (category === "leads" && campaignMetaData.leads === 0) ||
              (category === "sales" && campaignMetaData.purchases === 0) ||
              (category === "traffic" && campaignMetaData.linkClicks === 0)
            ) && campaignMetaData.spend > 0;

            if (hasNoExpectedData) {
              insights.unshift({
                text: `Esta campaña puede tener conjuntos con diferentes objetivos — revisa a nivel de conjunto de anuncios`,
                color: "var(--color-warning)",
                icon: "ℹ️",
              });
            }
          }

          // Selected campaign insights
          if (selectedCampaign) {
            insights.unshift({
              text: `Filtrando: ${selectedCampaign.name} · ${selectedCampaign.objectiveLabel}`,
              color: "var(--color-lavender)",
              icon: "📣",
            });
          }

          if (insights.length === 0) return null;

          return (
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {insights.slice(0, 3).map((ins, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    background: "var(--color-surface-glass)",
                    border: `1px solid color-mix(in srgb, ${ins.color} 30%, transparent)`,
                    borderLeft: `3px solid ${ins.color}`,
                    borderRadius: 8, padding: "7px 12px",
                    fontSize: 11.5, color: "var(--color-text-secondary)",
                  }}
                >
                  <span>{ins.icon}</span>
                  <span>{ins.text}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── AriClaro Fixed Layout ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingBottom: 80 }}>

          {/* ─ TOP 3 METRIC CARDS ─ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
            {/* Gasto */}
            <div className="dashboard-card" style={{ background:"#fff", borderRadius:40, border:"1px solid rgba(226,232,240,0.8)", padding:"24px 26px", boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 8px 24px rgba(30,11,66,0.06)", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, width:96, height:96, background:"#7c3aed08", borderBottomLeftRadius:"100%", marginRight:-40, marginTop:-40 }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:"#7c3aed", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 6px 16px -4px #7c3aed60" }}>⚡</div>
                <span style={{ fontSize:8, fontWeight:800, letterSpacing:"0.08em", padding:"3px 8px", borderRadius:8, background:"#7c3aed15", color:"#7c3aed", textTransform:"uppercase", maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{periodLabel}</span>
              </div>
              <p style={{ fontSize:13, color:"#64748b", fontWeight:500, margin:"0 0 4px" }}>Gasto {customRangeData ? "del período" : "Hoy"}</p>
              <h4 style={{ fontSize:32, fontWeight:900, color:"#1e0b42", letterSpacing:"-0.04em", margin:0, lineHeight:1 }}>S/ {(activeData?.spend ?? 0).toFixed(2)}</h4>
            </div>
            {/* Hero Metric (Leads / Mensajes / Compras) */}
            <div className="dashboard-card" style={{ background:"#fff", borderRadius:40, border:"1px solid rgba(226,232,240,0.8)", padding:"24px 26px", boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 8px 24px rgba(30,11,66,0.06)", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, width:96, height:96, background:`${heroMetrics.color}08`, borderBottomLeftRadius:"100%", marginRight:-40, marginTop:-40 }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:"#f97316", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 6px 16px -4px #f9731660" }}>{heroMetrics.icon}</div>
                <span style={{ fontSize:8, fontWeight:800, letterSpacing:"0.08em", padding:"3px 8px", borderRadius:8, background:"#f9731615", color:"#f97316", textTransform:"uppercase", maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{periodLabel}</span>
              </div>
              <p style={{ fontSize:13, color:"#64748b", fontWeight:500, margin:"0 0 4px" }}>{heroMetrics.label} {customRangeData ? "en el período" : "Captados"}</p>
              <h4 style={{ fontSize:32, fontWeight:900, color:"#1e0b42", letterSpacing:"-0.04em", margin:0, lineHeight:1 }}>{heroMetrics.fmt(heroMetrics.value)}</h4>
            </div>
            {/* Cost Metric */}
            <div className="dashboard-card" style={{ background:"#fff", borderRadius:40, border:"1px solid rgba(226,232,240,0.8)", padding:"24px 26px", boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 8px 24px rgba(30,11,66,0.06)", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, width:96, height:96, background:"#f43f5e08", borderBottomLeftRadius:"100%", marginRight:-40, marginTop:-40 }} />
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
                <div style={{ width:44, height:44, borderRadius:14, background:"#f43f5e", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:"0 6px 16px -4px #f43f5e60" }}>🎯</div>
                <span style={{ fontSize:8, fontWeight:800, letterSpacing:"0.08em", padding:"3px 8px", borderRadius:8, background:"#f43f5e15", color:"#f43f5e", textTransform:"uppercase", maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{periodLabel}</span>
              </div>
              <p style={{ fontSize:13, color:"#64748b", fontWeight:500, margin:"0 0 4px" }}>{costMetric.label} {customRangeData ? "del período" : "Hoy"}</p>
              <h4 style={{ fontSize:32, fontWeight:900, color:"#1e0b42", letterSpacing:"-0.04em", margin:0, lineHeight:1 }}>{costMetric.fmt(costMetric.value)}</h4>
            </div>
          </div>

          {/* ─ ROW 2: Growth chart (dark, 8col) + Budget donut (4col) ─ */}
          <div style={{ display:"grid", gridTemplateColumns:"8fr 4fr", gap:20 }}>
            {/* Growth chart dark */}
            <div style={{ background:"#1e0b42", borderRadius:40, padding:"32px", boxShadow:"0 40px 80px -20px rgba(0,0,0,0.4)", position:"relative", overflow:"hidden", minHeight:380 }}>
              <div style={{ position:"absolute", bottom:0, left:0, width:"100%", height:"50%", background:"linear-gradient(to top, rgba(249,115,22,0.04), transparent)", pointerEvents:"none" }} />
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:32 }}>
                <div>
                  <h3 style={{ fontSize:22, fontWeight:800, color:"#fff", margin:"0 0 4px", letterSpacing:"-0.03em" }}>Crecimiento de {heroMetrics.label}</h3>
                  <p style={{ fontSize:11, color:"rgba(249,115,22,0.6)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.15em", margin:0 }}>Progreso diario de captación</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.15em", margin:"0 0 4px" }}>Acumulado</p>
                  <p style={{ fontSize:28, fontWeight:900, color:"#fb923c", letterSpacing:"-0.04em", margin:0 }}>{heroMetrics.monthValue.toLocaleString("es-PE")}</p>
                </div>
              </div>
              <div style={{ height:220 }}>
                {dailyLoading ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"rgba(255,255,255,0.3)", fontSize:13 }}>Cargando...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb923c" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <RechartsXAxis dataKey="label" tick={{ fontSize:9, fill:"rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize:9, fill:"rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background:"rgba(15,23,42,0.95)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, fontSize:11, color:"#fff" }} />
                      <Area type="monotone" dataKey={heroMetrics.cumKey} stroke="#fb923c" strokeWidth={2.5} fill="url(#growthGrad)" name={heroMetrics.label} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            {/* Budget donut */}
            <div className="dashboard-card" style={{ background:"#fff", borderRadius:40, border:"1px solid rgba(226,232,240,0.8)", padding:"28px 24px", boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 8px 24px rgba(30,11,66,0.06)", minHeight:380, display:"flex", flexDirection:"column" }}>
              <div style={{ textAlign:"center", marginBottom:24 }}>
                <h3 style={{ fontSize:18, fontWeight:800, color:"#1e0b42", margin:"0 0 4px", letterSpacing:"-0.02em" }}>Inversión del Mes</h3>
                <p style={{ fontSize:10, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.15em", margin:0 }}>30 días acumulado</p>
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
                <div style={{ width:"100%", height:180, position:"relative" }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ name:"Invertido", value: metaMonthly?.spend ?? 0 }, { name:"Meta", value: Math.max(0, (metaMonthly?.spend ?? 0) * 0.3) }]} cx="50%" cy="50%" innerRadius={55} outerRadius={80} startAngle={90} endAngle={-270} paddingAngle={3} dataKey="value">
                        <Cell fill="#7c3aed" />
                        <Cell fill="#f1f5f9" />
                      </Pie>
                      <Tooltip contentStyle={{ background:"rgba(15,23,42,0.9)", border:"none", borderRadius:10, fontSize:11, color:"#fff" }} formatter={(v: any) => [`S/ ${Number(v).toFixed(2)}`]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", textAlign:"center" }}>
                    <div style={{ fontSize:18, fontWeight:900, color:"#1e0b42", letterSpacing:"-0.03em" }}>S/ {(metaMonthly?.spend ?? 0).toFixed(0)}</div>
                    <div style={{ fontSize:9, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>Gastado</div>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, width:"100%", marginTop:16 }}>
                  <div style={{ padding:"14px 12px", background:"#f8fafc", borderRadius:20, border:"1px solid #e2e8f0", textAlign:"center" }}>
                    <p style={{ fontSize:9, fontWeight:800, color:"#94a3b8", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 4px" }}>Gasto</p>
                    <p style={{ fontSize:13, fontWeight:900, color:"#1e0b42", margin:0 }}>S/ {(metaMonthly?.spend ?? 0).toFixed(0)}</p>
                  </div>
                  <div style={{ padding:"14px 12px", background:"#f5f3ff", borderRadius:20, border:"1px solid #ede9fe", textAlign:"center" }}>
                    <p style={{ fontSize:9, fontWeight:800, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 4px" }}>CPL Prom.</p>
                    <p style={{ fontSize:13, fontWeight:900, color:"#7c3aed", margin:0 }}>S/ {(metaMonthly?.cpl ?? 0).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─ ROW 3: Daily leads bar (6col) + CPL trend dark (6col) ─ */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
            {/* Daily leads bar */}
            <div className="dashboard-card" style={{ background:"#fff", borderRadius:40, border:"1px solid rgba(226,232,240,0.8)", padding:"28px 28px 20px", boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 8px 24px rgba(30,11,66,0.06)", minHeight:340 }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
                <div>
                  <h3 style={{ fontSize:20, fontWeight:800, color:"#1e0b42", margin:"0 0 3px", letterSpacing:"-0.03em" }}>{heroMetrics.label} Diarios</h3>
                  <p style={{ fontSize:12, color:"#94a3b8", fontWeight:500, margin:0 }}>Registro de captación por día</p>
                </div>
                <div style={{ width:48, height:48, background:"#f5f3ff", borderRadius:20, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📊</div>
              </div>
              <div style={{ height:220 }}>
                {dailyLoading ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#94a3b8", fontSize:13 }}>Cargando...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.8)" />
                      <RechartsXAxis dataKey="label" tick={{ fontSize:9, fill:"#94a3b8" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize:9, fill:"#94a3b8" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background:"rgba(15,23,42,0.9)", border:"none", borderRadius:10, fontSize:11, color:"#fff" }} />
                      <Bar dataKey={heroMetrics.barKey} fill={heroMetrics.color} radius={[6,6,0,0]} name={heroMetrics.label} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            {/* CPL trend dark */}
            <div style={{ background:"#1e0b42", borderRadius:40, padding:"28px 28px 20px", boxShadow:"0 40px 80px -20px rgba(0,0,0,0.4)", position:"relative", overflow:"hidden", minHeight:340 }}>
              <div style={{ position:"absolute", top:0, right:0, width:240, height:240, background:"rgba(124,58,237,0.08)", borderRadius:"50%", marginRight:-120, marginTop:-120, filter:"blur(40px)", pointerEvents:"none" }} />
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:28 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                    <span style={{ width:10, height:10, background:"#fb923c", borderRadius:"50%", boxShadow:"0 0 12px #fb923c", display:"inline-block" }} />
                    <h3 style={{ fontSize:20, fontWeight:800, color:"#fff", margin:0, letterSpacing:"-0.03em" }}>Tendencia {costMetric.label}</h3>
                  </div>
                  <p style={{ fontSize:12, color:"#475569", fontWeight:500, margin:0 }}>Fluctuación diaria</p>
                </div>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:10, fontWeight:800, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 4px" }}>Promedio</p>
                  <p style={{ fontSize:20, fontWeight:900, color:"#fb923c", margin:0, letterSpacing:"-0.03em" }}>{costMetric.fmt(costMetric.monthValue)}</p>
                </div>
              </div>
              <div style={{ height:220 }}>
                {dailyLoading ? (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"rgba(255,255,255,0.3)", fontSize:13 }}>Cargando...</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData} margin={{ top:4, right:4, left:-20, bottom:0 }}>
                      <defs>
                        <linearGradient id="cplGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb923c" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#fb923c" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <RechartsXAxis dataKey="label" tick={{ fontSize:9, fill:"rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis tick={{ fontSize:9, fill:"rgba(255,255,255,0.3)" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background:"rgba(15,23,42,0.95)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:12, fontSize:11, color:"#fff" }} />
                      <Line type="monotone" dataKey="cpl" stroke="#fb923c" strokeWidth={2.5} dot={false} name={costMetric.label} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* ─ CONVERSION FUNNEL (full width) ─ */}
          {metaMonthly && (
            <div className="dashboard-card" style={{ background:"#fff", borderRadius:48, border:"1px solid rgba(226,232,240,0.8)", padding:"36px 40px", boxShadow:"0 1px 3px rgba(0,0,0,0.04),0 8px 24px rgba(30,11,66,0.06)", position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", top:0, right:0, padding:48, opacity:0.025, pointerEvents:"none" }}>
                <span style={{ fontSize:200, lineHeight:1 }}>▼</span>
              </div>
              <div style={{ marginBottom:36 }}>
                <h3 style={{ fontSize:28, fontWeight:800, color:"#1e0b42", margin:"0 0 4px", letterSpacing:"-0.04em" }}>Embudo de Conversión</h3>
                <p style={{ fontSize:13, color:"#94a3b8", fontWeight:500, margin:0 }}>Análisis de eficiencia del funnel publicitario · últimos 30 días</p>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:40, alignItems:"center" }}>
                {/* Funnel visual */}
                <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:0 }}>
                  {[
                    { label:"Alcance", value: metaMonthly.reach, color:"#ede9fe", textColor:"#1e0b42", convLabel: `${metaMonthly.reach > 0 ? ((metaMonthly.clicks/metaMonthly.reach)*100).toFixed(2) : "0"}% CTR`, clip:"polygon(0 0,100% 0,88% 100%,12% 100%)", width:"100%" },
                    { label:"Clics", value: metaMonthly.clicks, color:"#ffedd5", textColor:"#1e0b42", convLabel: `${metaMonthly.clicks > 0 ? ((metaMonthly.landingPageViews/metaMonthly.clicks)*100).toFixed(1) : "0"}% Visita`, clip:"polygon(12% 0,88% 0,78% 100%,22% 100%)", width:"88%" },
                    { label:"Visitas", value: metaMonthly.landingPageViews, color:"#fed7aa", textColor:"#1e0b42", convLabel: `${metaMonthly.landingPageViews > 0 ? ((metaMonthly.leads/metaMonthly.landingPageViews)*100).toFixed(1) : "0"}% Conv.`, clip:"polygon(22% 0,78% 0,65% 100%,35% 100%)", width:"78%" },
                    { label:`${heroMetrics.label} Finales`, value: heroMetrics.monthValue, color:"#fb923c", textColor:"#fff", convLabel: "", clip:"polygon(35% 0,65% 0,60% 100%,40% 100%)", width:"65%" },
                  ].map((stage, i) => (
                    <div key={i} style={{ width:stage.width, position:"relative" }}>
                      <div style={{
                        background: stage.color, clipPath: stage.clip,
                        padding: i === 3 ? "40px 24px 48px" : "32px 24px", textAlign:"center",
                        marginTop: i > 0 ? -16 : 0,
                        boxShadow: i === 3 ? "0 10px 30px -5px rgba(251,146,60,0.35)" : "none",
                        transition:"all 0.3s",
                      }}>
                        <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.12em", color: stage.textColor, opacity: i===3?0.8:0.55, margin:"0 0 4px" }}>{stage.label}</p>
                        <p style={{ fontSize:28, fontWeight:900, color: stage.textColor, letterSpacing:"-0.04em", margin:0, lineHeight:1 }}>{stage.value.toLocaleString("es-PE")}</p>
                      </div>
                      {stage.convLabel && (
                        <div style={{ position:"absolute", bottom:-14, left:"50%", transform:"translateX(-50%)", background:"#fff", padding:"3px 12px", borderRadius:99, fontSize:10, fontWeight:800, boxShadow:"0 4px 10px rgba(0,0,0,0.06)", border:"1px solid rgba(0,0,0,0.04)", color:"#f97316", zIndex:10, whiteSpace:"nowrap" }}>
                          {stage.convLabel}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                {/* Summary cards */}
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  <div style={{ padding:"28px", background:"#f5f3ff", borderRadius:28, border:"1px solid #ede9fe", position:"relative", overflow:"hidden" }}>
                    <p style={{ fontSize:10, fontWeight:800, color:"#7c3aed", textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 12px" }}>Costo por Clic Promedio</p>
                    <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"#94a3b8" }}>S/.</span>
                      <span style={{ fontSize:36, fontWeight:900, color:"#1e0b42", letterSpacing:"-0.04em" }}>
                        {metaMonthly.clicks > 0 ? (metaMonthly.spend / metaMonthly.clicks).toFixed(2) : "0.00"}
                      </span>
                    </div>
                    <p style={{ fontSize:10, color:"#94a3b8", marginTop:6, fontWeight:500 }}>Inversión por cada clic generado</p>
                  </div>
                  <div style={{ padding:"28px", background:"#1e0b42", borderRadius:28, position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, right:0, width:80, height:80, background:"rgba(249,115,22,0.1)", borderRadius:"50%", marginRight:-20, marginTop:-20, filter:"blur(16px)" }} />
                    <p style={{ fontSize:10, fontWeight:800, color:"rgba(167,139,250,0.5)", textTransform:"uppercase", letterSpacing:"0.12em", margin:"0 0 12px" }}>{costMetric.label} Mensual</p>
                    <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
                      <span style={{ fontSize:13, fontWeight:700, color:"rgba(167,139,250,0.3)" }}>S/.</span>
                      <span style={{ fontSize:36, fontWeight:900, color:"#fff", letterSpacing:"-0.04em" }}>
                        {(metaMonthly.cpl ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <p style={{ fontSize:10, color:"rgba(167,139,250,0.4)", marginTop:6, fontWeight:500 }}>Eficiencia de captación mensual</p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        </div>
    </>
  );
}
