"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import { useState, useEffect, useRef } from "react";
import GridLayout from "react-grid-layout";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis as RechartsXAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { X, Zap, Send } from "lucide-react";
import { AluCharacter, AluAvatar, ALU_CHARACTER_STYLES, type AluMode } from "@/components/alu-ia/AluCharacter";
import Link from "next/link";
import { ErrorState } from "@/components/ui/error-state";
import { ChartSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";

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
    let message = "Sin datos para este período";
    if (data === null || data === undefined) {
      if (metaError) message = "Error al cargar datos de Meta Ads. Intenta recargar la página.";
      else if (metaConfigured === false) message = "Conecta tu cuenta de Meta Ads para ver esta métrica";
    }

    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", height: "100%", gap: 8, color: "var(--color-text-muted)",
      }}>
        <span style={{ fontSize: 28 }}>{cfg?.icon ?? "📊"}</span>
        <span style={{ fontSize: 11, textAlign: "center", padding: "0 12px" }}>
          {message}
        </span>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 18px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ fontSize: 34, fontWeight: 900, color: cfg?.color ?? "var(--color-text-primary)", lineHeight: 1, marginBottom: 6 }}>
        {formatted}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--color-text-faint)" }}>{cfg?.description}</div>
      {delta !== null && (
        <div style={{
          fontSize: 11, marginTop: 4, display: "flex", alignItems: "center", gap: 3,
          color: deltaPositive ? "var(--color-success)" : "var(--color-coral)",
        }}>
          <span>{delta > 0 ? "↑" : "↓"}</span>
          <span>{Math.abs(delta).toFixed(1)}% vs ayer</span>
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
  const [customRangeData, setCustomRangeData] = useState<MetaData | null>(null);
  const [customRangeLoading, setCustomRangeLoading] = useState(false);
  const [customRangeError, setCustomRangeError] = useState<string | null>(null);

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
          border-radius: 14px !important;
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
      <div style={{ padding: "24px" }}>

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderRadius: 14, marginBottom: 16,
          background: "linear-gradient(135deg,rgba(43,9,111,0.25) 0%,rgba(114,85,180,0.08) 100%)",
          border: "1px solid rgba(114,85,180,0.15)",
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.03em" }}>
              Hola, {companyName || userName.split(" ")[0]} 👋
            </h1>
            <p style={{ fontSize: 12.5, color: "var(--color-text-faint)", margin: "4px 0 0" }}>
              {currentDateTime || " "}
            </p>
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
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Mi Dashboard</div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>Arrastra · Redimensiona · Personaliza</div>
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

            {/* Custom date range */}
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
                <span>{customRangeData ? `${customSince} → ${customUntil}` : "Rango personalizado"}</span>
                <span style={{ fontSize: 9, color: "var(--color-text-muted)" }}>▼</span>
              </button>

              {customRangeOpen && (
                <>
                  <div onClick={() => setCustomRangeOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60,
                    background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)",
                    borderRadius: 12, padding: 14, minWidth: 240,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                  }}>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                      Comparar contra el Administrador de anuncios
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <label style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>
                        Desde
                        <input
                          type="date"
                          value={customSince}
                          onChange={(e) => setCustomSince(e.target.value)}
                          style={{
                            width: "100%", marginTop: 3, background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(114,85,180,0.25)", borderRadius: 6, padding: "6px 8px",
                            color: "var(--color-text-primary)", fontSize: 12, outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </label>
                      <label style={{ fontSize: 10.5, color: "var(--color-text-muted)" }}>
                        Hasta
                        <input
                          type="date"
                          value={customUntil}
                          onChange={(e) => setCustomUntil(e.target.value)}
                          style={{
                            width: "100%", marginTop: 3, background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(114,85,180,0.25)", borderRadius: 6, padding: "6px 8px",
                            color: "var(--color-text-primary)", fontSize: 12, outline: "none", boxSizing: "border-box",
                          }}
                        />
                      </label>
                      <button
                        onClick={fetchCustomRange}
                        disabled={!customSince || !customUntil || customRangeLoading}
                        style={{
                          marginTop: 2, background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                          border: "none", borderRadius: 8, padding: "8px 0",
                          color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer",
                          opacity: !customSince || !customUntil || customRangeLoading ? 0.5 : 1,
                        }}
                      >
                        {customRangeLoading ? "Consultando..." : "Consultar"}
                      </button>
                      {customRangeData && (
                        <button
                          onClick={() => { setCustomRangeData(null); setCustomRangeError(null); }}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", fontSize: 11 }}
                        >
                          Quitar rango
                        </button>
                      )}
                    </div>
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

        {/* ── Grid canvas ── */}
        <div ref={gridRef}>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--color-text-muted)" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                Tu dashboard está vacío
              </div>
              <div style={{ fontSize: 13 }}>Haz click en "+" para agregar métricas o gráficos</div>
            </div>
          ) : (
            <GridLayout
              layout={layout}
              width={gridWidth}
              gridConfig={{
                cols: 12,
                rowHeight: 80,
                margin: [12, 12] as [number, number],
                containerPadding: [0, 0] as [number, number],
              }}
              dragConfig={{ enabled: true, handle: ".drag-handle" }}
              resizeConfig={{ enabled: true }}
              onLayoutChange={(newLayout) => {
                setItems((prev) => {
                  const updated = prev.map((item) => {
                    const pos = newLayout.find((l) => l.i === item.id);
                    return pos ? { ...item, x: pos.x, y: pos.y, w: pos.w, h: pos.h } : item;
                  });
                  debouncedSave(updated);
                  return updated;
                });
              }}
              style={{ minHeight: 400 }}
            >
              {items.map((item) => {
                const metricCfg = item.type === "metric_card"
                  ? METRIC_CATALOG.find((m) => m.id === item.metric)
                  : undefined;

                return (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--color-surface-card)",
                      border: "1px solid rgba(114,85,180,0.18)",
                      borderRadius: 14,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    {/* Drag-handle header */}
                    <div
                      className="drag-handle"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "8px 12px", flexShrink: 0,
                        background: "rgba(43,9,111,0.2)",
                        borderBottom: "1px solid rgba(114,85,180,0.12)",
                        userSelect: "none",
                      }}
                    >
                      {/* Left: icon + label */}
                      <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                        <span style={{ fontSize: 12, flexShrink: 0 }}>
                          {item.type === "funnel"
                            ? "🔻"
                            : item.type === "campaign_comparison"
                            ? "📊"
                            : item.type === "metric_card"
                            ? (metricCfg?.icon ?? "📊")
                            : "📈"}
                        </span>
                        <span style={{
                          fontSize: 11, fontWeight: 600, color: "var(--color-text-secondary)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {item.type === "funnel"
                            ? "Embudo de conversión"
                            : item.type === "campaign_comparison"
                            ? "Mis campañas"
                            : item.type === "metric_card"
                            ? (metricCfg?.label ?? item.metric)
                            : (item.metrics ?? [])
                                .map((id) => METRIC_CATALOG.find((m) => m.id === id)?.label ?? id)
                                .join(" · ")}
                        </span>
                      </div>

                      {/* Right: period toggle + X */}
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                        {item.type === "metric_card" &&
                          (["today", "last_7d", "last_30d"] as Period[]).map((p) => (
                            <button
                              key={p}
                              onClick={(e) => { e.stopPropagation(); updateItemPeriod(item.id, p); }}
                              style={{
                                background: item.period === p
                                  ? "rgba(114,85,180,0.4)"
                                  : "rgba(255,255,255,0.05)",
                                border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer",
                                fontSize: 9.5,
                                color: item.period === p ? "var(--color-text-primary)" : "var(--color-text-muted)",
                              }}
                            >
                              {p === "today" ? "Hoy" : p === "last_7d" ? "7d" : "30d"}
                            </button>
                          ))}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--color-text-muted)", padding: 2, display: "flex", alignItems: "center",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-coral)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                      {item.type === "metric_card" ? (
                        <MetricCardContent item={item} metaToday={effectiveMetaToday} metaMonthly={metaMonthly} metaYesterday={effectiveMetaYesterday} metaError={metaError} metaConfigured={metaConfigured} />
                      ) : item.type === "funnel" ? (
                        <FunnelContent metaToday={effectiveMetaToday} selectedCampaign={selectedCampaign} metaError={metaError} metaConfigured={metaConfigured} />
                      ) : item.type === "campaign_comparison" ? (
                        <CampaignComparisonContent campaigns={campaigns} error={campaignsError} onRetry={loadCampaigns} />
                      ) : (
                        <ChartContent item={item} campaignId={selectedCampaign?.id ?? null} />
                      )}
                    </div>
                  </div>
                );
              })}
            </GridLayout>
          )}
        </div>
      </div>
    </>
  );
}
