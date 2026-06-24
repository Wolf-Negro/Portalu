"use client";

import { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import {
  Megaphone, TrendingUp, AlertTriangle, DollarSign,
  Users, Target, Eye, RefreshCw,
  ChevronDown, ChevronUp, Video, MousePointer,
} from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { ErrorState } from "@/components/ui/error-state";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  name: string;
  status: "active" | "paused";
  objective?: string;
  budget: number;
  spent: number;
  reach: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  landingViews: number;
  videoViews: number;
  leads: number;
  cpl: number;
  ctr: number;
  cpm: number;
  frequency: number;
  roas: number;
  startDate?: string;
  hasFatigue: boolean;
}

interface AdSet {
  id: string;
  name: string;
  status: string;
  dailyBudget: number;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  landingViews: number;
  leads: number;
  ctr: number;
}

interface Ad {
  id: string;
  name: string;
  status: string;
  creative: {
    thumbnailUrl?: string | null;
    body?: string | null;
    title?: string | null;
  };
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  landingViews: number;
  videoViews: number;
  leads: number;
  ctr: number;
  cpm: number;
}

type MetricKey =
  | "leads" | "cpl" | "reach" | "impressions" | "clicks"
  | "ctr" | "cpm" | "frequency" | "landingViews" | "videoViews"
  | "roas" | "linkClicks";

interface ObjectiveConfig {
  label: string;
  color: string;
  primaryMetrics: MetricKey[];
  icon: string;
}

// ─── Objective Config ─────────────────────────────────────────────────────────

const OBJECTIVE_CONFIG: Record<string, ObjectiveConfig> = {
  LEAD_GENERATION: {
    label: "Generación de Leads",
    color: "var(--color-success)",
    primaryMetrics: ["leads", "cpl", "ctr"],
    icon: "🎯",
  },
  OUTCOME_LEADS: {
    label: "Generación de Leads",
    color: "var(--color-success)",
    primaryMetrics: ["leads", "cpl", "ctr"],
    icon: "🎯",
  },
  CONVERSIONS: {
    label: "Conversiones / Ventas",
    color: "var(--color-warning)",
    primaryMetrics: ["roas", "cpl", "clicks"],
    icon: "💰",
  },
  OUTCOME_SALES: {
    label: "Conversiones / Ventas",
    color: "var(--color-warning)",
    primaryMetrics: ["roas", "cpl", "clicks"],
    icon: "💰",
  },
  REACH: {
    label: "Alcance / Awareness",
    color: "#38bdf8",
    primaryMetrics: ["reach", "impressions", "frequency", "cpm"],
    icon: "📡",
  },
  OUTCOME_AWARENESS: {
    label: "Alcance / Awareness",
    color: "#38bdf8",
    primaryMetrics: ["reach", "impressions", "frequency", "cpm"],
    icon: "📡",
  },
  BRAND_AWARENESS: {
    label: "Alcance / Awareness",
    color: "#38bdf8",
    primaryMetrics: ["reach", "impressions", "frequency", "cpm"],
    icon: "📡",
  },
  VIDEO_VIEWS: {
    label: "Visualizaciones de Video",
    color: "#a78bfa",
    primaryMetrics: ["videoViews", "impressions", "ctr"],
    icon: "▶️",
  },
  LINK_CLICKS: {
    label: "Clics / Engagement",
    color: "#fb923c",
    primaryMetrics: ["clicks", "linkClicks", "landingViews", "ctr"],
    icon: "🔗",
  },
  POST_ENGAGEMENT: {
    label: "Clics / Engagement",
    color: "#fb923c",
    primaryMetrics: ["clicks", "linkClicks", "landingViews", "ctr"],
    icon: "🔗",
  },
};

const FALLBACK_OBJECTIVE: ObjectiveConfig = {
  label: "Campaña",
  color: "var(--color-lavender)",
  primaryMetrics: ["clicks", "impressions", "ctr"],
  icon: "📣",
};

function getObjectiveConfig(objective?: string): ObjectiveConfig {
  if (!objective) return FALLBACK_OBJECTIVE;
  return OBJECTIVE_CONFIG[objective] ?? FALLBACK_OBJECTIVE;
}

// ─── Period options ───────────────────────────────────────────────────────────

const PERIOD_OPTIONS: { label: string; value: string }[] = [
  { label: "7d", value: "last_7d" },
  { label: "14d", value: "last_14d" },
  { label: "30d", value: "last_30d" },
  { label: "Este mes", value: "this_month" },
  { label: "Mes anterior", value: "last_month" },
];

// ─── MetricTile (global summary) ──────────────────────────────────────────────

function MetricTile({ label, value, icon: Icon, alert, sub }: {
  label: string;
  value: string;
  icon: React.ElementType;
  alert?: boolean;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: alert ? "rgba(239,68,68,0.07)" : "var(--color-surface-glass)",
        border: `1px solid ${alert ? "rgba(239,68,68,0.28)" : "rgba(114,85,180,0.18)"}`,
      }}
    >
      <div className="flex items-center justify-between mb-2.5">
        <span
          className="text-[11px] font-medium uppercase tracking-wider"
          style={{ color: "var(--color-text-muted)" }}
        >
          {label}
        </span>
        {alert
          ? <AlertTriangle size={13} style={{ color: "var(--color-danger)" }} />
          : <Icon size={13} style={{ color: "var(--color-lavender)" }} />}
      </div>
      <div className="text-xl font-bold" style={{ color: alert ? "var(--color-danger)" : "var(--color-text-primary)" }}>
        {value}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── ObjectiveBadge ───────────────────────────────────────────────────────────

function ObjectiveBadge({ objective }: { objective?: string }) {
  const cfg = getObjectiveConfig(objective);
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
      style={{
        background: `${cfg.color}22`,
        border: `1px solid ${cfg.color}55`,
        color: cfg.color,
      }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Campaign metric row helper ───────────────────────────────────────────────

interface CampaignMetricItem {
  label: string;
  value: string;
  metricKey: MetricKey;
}

function buildCampaignMetrics(c: Campaign): CampaignMetricItem[] {
  return [
    { label: "Inversión", value: formatCurrency(c.spent), metricKey: "leads" /* investment — always shown normally */ as MetricKey },
    { label: "Alcance", value: formatNumber(c.reach), metricKey: "reach" },
    { label: "Impresiones", value: formatNumber(c.impressions), metricKey: "impressions" },
    { label: "Clics totales", value: formatNumber(c.clicks), metricKey: "clicks" },
    { label: "Clics enlace", value: formatNumber(c.linkClicks), metricKey: "linkClicks" },
    { label: "Vistas landing", value: formatNumber(c.landingViews), metricKey: "landingViews" },
    { label: "Video views", value: formatNumber(c.videoViews), metricKey: "videoViews" },
    { label: "CTR", value: formatPercent(c.ctr), metricKey: "ctr" },
    { label: "CPM", value: formatCurrency(c.cpm), metricKey: "cpm" },
    { label: "Frecuencia", value: `${c.frequency}x`, metricKey: "frequency" },
    { label: "Leads", value: c.leads > 0 ? String(c.leads) : "—", metricKey: "leads" },
    { label: "CPL", value: c.cpl > 0 ? formatCurrency(c.cpl) : "—", metricKey: "cpl" },
  ];
}

// ─── Objective summary block ───────────────────────────────────────────────────

interface ObjectiveGroup {
  objective: string | undefined;
  campaigns: Campaign[];
}

function ObjectiveSummaryBlock({ groups }: { groups: ObjectiveGroup[] }) {
  if (groups.length <= 1) return null;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--color-surface-glass)",
        border: "1px solid rgba(114,85,180,0.18)",
      }}
    >
      <h4
        className="text-xs font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--color-text-secondary)" }}
      >
        Resumen por objetivo
      </h4>
      <div className="flex flex-wrap gap-3">
        {groups.map((g) => {
          const cfg = getObjectiveConfig(g.objective);
          const totalLeads = g.campaigns.reduce((s, c) => s + c.leads, 0);
          const totalSpent = g.campaigns.reduce((s, c) => s + c.spent, 0);
          const totalReach = g.campaigns.reduce((s, c) => s + c.reach, 0);
          const totalVideoViews = g.campaigns.reduce((s, c) => s + c.videoViews, 0);
          const totalClicks = g.campaigns.reduce((s, c) => s + c.clicks, 0);

          const withLeads = g.campaigns.filter((c) => c.leads > 0);
          const avgCPL =
            withLeads.length > 0
              ? withLeads.reduce((s, c) => s + c.cpl, 0) / withLeads.length
              : 0;

          // Build summary line based on objective
          const summaryParts: string[] = [`${g.campaigns.length} campaña${g.campaigns.length !== 1 ? "s" : ""}`];

          const p = cfg.primaryMetrics;
          if (p.includes("leads") && totalLeads > 0) summaryParts.push(`${totalLeads} leads`);
          if (p.includes("cpl") && avgCPL > 0) summaryParts.push(`CPL prom. ${formatCurrency(avgCPL)}`);
          if (p.includes("reach")) summaryParts.push(`Alcance ${formatNumber(totalReach)}`);
          if (p.includes("videoViews") && totalVideoViews > 0) summaryParts.push(`${formatNumber(totalVideoViews)} reproducciones`);
          if (p.includes("clicks")) summaryParts.push(`${formatNumber(totalClicks)} clics`);
          if (p.includes("impressions")) {
            const totalImp = g.campaigns.reduce((s, c) => s + c.impressions, 0);
            summaryParts.push(`${formatNumber(totalImp)} impresiones`);
          }
          if (!p.includes("leads") && !p.includes("reach") && !p.includes("videoViews")) {
            summaryParts.push(`${formatCurrency(totalSpent)} invertido`);
          }

          return (
            <div
              key={g.objective ?? "__fallback__"}
              className="flex-1 min-w-[200px] rounded-lg p-3"
              style={{
                background: `${cfg.color}11`,
                border: `1px solid ${cfg.color}33`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <span style={{ fontSize: 14 }}>{cfg.icon}</span>
                <span
                  className="text-xs font-semibold"
                  style={{ color: cfg.color }}
                >
                  {cfg.label}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>
                {summaryParts.join(" · ")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CampanasClient({
  campaigns: initialCampaigns,
  metaError,
  metaAccounts = [],
}: {
  campaigns: Campaign[];
  metaError?: string;
  metaAccounts?: { accountId: string; label: string | null }[];
}) {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [accountSelectorOpen, setAccountSelectorOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(initialCampaigns[0]?.id || null);
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [dailyData, setDailyData] = useState<unknown[]>([]);
  const [loadingAdsets, setLoadingAdsets] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [errorAdsets, setErrorAdsets] = useState(false);
  const [errorDaily, setErrorDaily] = useState(false);
  const [showAdsets, setShowAdsets] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Period state
  const [datePreset, setDatePreset] = useState("last_30d");

  // Ads state
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [errorAds, setErrorAds] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const [selectedAdset, setSelectedAdset] = useState<string | null>(null);

  // Hourly breakdown (lead-gen campaigns only)
  const [hourlyData, setHourlyData] = useState<{ hour: number; label: string; leads: number; clicks: number }[]>([]);
  const [loadingHourly, setLoadingHourly] = useState(false);
  const [errorHourly, setErrorHourly] = useState(false);

  // Objective filter state
  const [objectiveFilter, setObjectiveFilter] = useState<string | null>(null);

  const campaign = campaigns.find((c) => c.id === selected);

  // When campaign selection changes, reload daily data and reset adsets/ads
  useEffect(() => {
    if (!selected) return;
    loadDailyData(selected, datePreset);
    setShowAdsets(false);
    setAdsets([]);
    setShowAds(false);
    setAds([]);
    setSelectedAdset(null);
    setHourlyData([]);
    // Load hourly breakdown only for lead-gen campaigns
    const selCampaign = campaigns.find((c) => c.id === selected);
    if (selCampaign?.objective && LEAD_OBJECTIVES.has(selCampaign.objective)) {
      loadHourlyData(selected, datePreset);
    }
  }, [selected]);

  // When datePreset or selectedAccountId changes, reload everything
  useEffect(() => {
    if (selected) loadDailyData(selected, datePreset);
    refreshCampaignsWithPreset(datePreset);
    if (showAdsets && selected) loadAdsets(selected, datePreset);
    if (showAds && selectedAdset) loadAds(selectedAdset, datePreset);
    if (selected) {
      const selCampaign = campaigns.find((c) => c.id === selected);
      if (selCampaign?.objective && LEAD_OBJECTIVES.has(selCampaign.objective)) {
        loadHourlyData(selected, datePreset);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datePreset, selectedAccountId]);

  async function loadDailyData(campaignId: string, preset: string = datePreset) {
    setLoadingDaily(true);
    setErrorDaily(false);
    try {
      const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : "";
      const res = await fetch(`/api/meta/daily?campaign_id=${campaignId}&date_preset=${preset}${accountParam}`);
      if (!res.ok) throw new Error("Error al cargar datos diarios");
      const data = await res.json();
      setDailyData(data.daily || []);
    } catch {
      setErrorDaily(true);
    }
    setLoadingDaily(false);
  }

  async function loadAdsets(campaignId: string, preset: string = datePreset) {
    setLoadingAdsets(true);
    setErrorAdsets(false);
    setShowAdsets(true);
    try {
      const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : "";
      const res = await fetch(`/api/meta/adsets?campaign_id=${campaignId}&date_preset=${preset}${accountParam}`);
      if (!res.ok) throw new Error("Error al cargar conjuntos de anuncios");
      const data = await res.json();
      setAdsets(data.adsets || []);
    } catch {
      setErrorAdsets(true);
    }
    setLoadingAdsets(false);
  }

  async function loadAds(adsetId: string, preset: string = datePreset) {
    setLoadingAds(true);
    setErrorAds(false);
    setShowAds(true);
    setSelectedAdset(adsetId);
    try {
      const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : "";
      const res = await fetch(`/api/meta/ads?adset_id=${adsetId}&date_preset=${preset}${accountParam}`);
      if (!res.ok) throw new Error("Error al cargar anuncios");
      const data = await res.json();
      setAds(data.ads || []);
    } catch {
      setErrorAds(true);
    }
    setLoadingAds(false);
  }

  const LEAD_OBJECTIVES = new Set(["LEAD_GENERATION", "OUTCOME_LEADS"]);

  async function loadHourlyData(campaignId: string, preset: string = datePreset) {
    setLoadingHourly(true);
    setErrorHourly(false);
    setHourlyData([]);
    try {
      const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : "";
      const res = await fetch(`/api/meta/hourly?campaign_id=${campaignId}&date_preset=${preset}${accountParam}`);
      if (!res.ok) throw new Error("Error al cargar datos por hora");
      const data = await res.json();
      if (data.hourly) setHourlyData(data.hourly);
    } catch {
      setErrorHourly(true);
    }
    setLoadingHourly(false);
  }

  async function refreshCampaignsWithPreset(preset: string) {
    try {
      const accountParam = selectedAccountId ? `&account_id=${selectedAccountId}` : "";
      const res = await fetch(`/api/meta/campaigns?date_preset=${preset}${accountParam}`);
      if (!res.ok) throw new Error("Error al actualizar campañas");
      const data = await res.json();
      if (data.campaigns) setCampaigns(data.campaigns);
    } catch {
      showToast("No se pudieron actualizar las campañas. Intenta de nuevo.", "error");
    }
  }

  async function refreshCampaigns() {
    setRefreshing(true);
    await refreshCampaignsWithPreset(datePreset);
    setRefreshing(false);
  }

  // ── Derived: unique objectives from current campaigns ──────────────────────

  const uniqueObjectives = useMemo<string[]>(() => {
    const seen = new Set<string>();
    campaigns.forEach((c) => {
      const key = c.objective ?? "__none__";
      seen.add(key);
    });
    return Array.from(seen);
  }, [campaigns]);

  // ── Objective groups for summary block ─────────────────────────────────────

  const objectiveGroups = useMemo<ObjectiveGroup[]>(() => {
    const map = new Map<string | undefined, Campaign[]>();
    campaigns.forEach((c) => {
      const key = c.objective;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return Array.from(map.entries()).map(([objective, cList]) => ({ objective, campaigns: cList }));
  }, [campaigns]);

  // ── Filtered campaigns list ────────────────────────────────────────────────

  const filteredCampaigns = useMemo<Campaign[]>(() => {
    if (objectiveFilter === null) return campaigns;
    if (objectiveFilter === "__none__") return campaigns.filter((c) => !c.objective);
    return campaigns.filter((c) => c.objective === objectiveFilter);
  }, [campaigns, objectiveFilter]);

  // ── Global totals (computed from ALL campaigns, not filtered) ──────────────

  const totals = {
    spent: campaigns.reduce((a, c) => a + c.spent, 0),
    leads: campaigns.reduce((a, c) => a + c.leads, 0),
    reach: campaigns.reduce((a, c) => a + c.reach, 0),
    clicks: campaigns.reduce((a, c) => a + c.clicks, 0),
    landingViews: campaigns.reduce((a, c) => a + c.landingViews, 0),
    avgCTR: campaigns.length
      ? campaigns.reduce((a, c) => a + c.ctr, 0) / campaigns.length
      : 0,
    avgCPL: campaigns.filter((c) => c.leads > 0).length
      ? campaigns.filter((c) => c.leads > 0).reduce((a, c) => a + c.cpl, 0) /
        campaigns.filter((c) => c.leads > 0).length
      : 0,
  };

  const chartData = dailyData.length > 0
    ? (dailyData as Array<{ date: string; clicks: number; spend: number; leads: number; ctr: number }>)
        .slice(-14)
        .map((d) => ({
          day: new Date(d.date).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" }),
          clicks: d.clicks,
          spend: d.spend,
          leads: d.leads,
          ctr: d.ctr,
        }))
    : [];

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === datePreset)?.label || "30d";

  // ── Campaign detail metrics ────────────────────────────────────────────────

  const campaignObjCfg = campaign ? getObjectiveConfig(campaign.objective) : FALLBACK_OBJECTIVE;
  const campaignMetrics = campaign ? buildCampaignMetrics(campaign) : [];
  const isLeadCampaign = !!(campaign?.objective && LEAD_OBJECTIVES.has(campaign.objective));

  // Peak hour for leads (for annotation)
  const peakHour = hourlyData.length > 0
    ? hourlyData.reduce((best, h) => h.leads > best.leads ? h : best, hourlyData[0])
    : null;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            Campañas Meta Ads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            Publicidad Consultora Alucinando · PEN · Lima
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter */}
          <div
            className="flex items-center gap-1 rounded-lg p-1"
            style={{
              background: "var(--color-surface-glass)",
              border: "1px solid rgba(114,85,180,0.18)",
            }}
          >
            {PERIOD_OPTIONS.map((opt) => {
              const isActive = datePreset === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setDatePreset(opt.value)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: isActive ? "rgba(114,85,180,0.3)" : "transparent",
                    border: isActive ? "1px solid rgba(114,85,180,0.5)" : "1px solid transparent",
                    color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {metaAccounts.length > 1 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setAccountSelectorOpen((v) => !v)}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: selectedAccountId ? "rgba(114,85,180,0.15)" : "var(--color-surface-glass)",
                  border: "1px solid rgba(114,85,180,0.2)",
                  color: "var(--color-text-secondary)", cursor: "pointer",
                }}
              >
                🏢 {selectedAccountId ? (metaAccounts.find((a) => a.accountId === selectedAccountId)?.label || selectedAccountId) : "Todas las cuentas"} ▼
              </button>
              {accountSelectorOpen && (
                <>
                  <div onClick={() => setAccountSelectorOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 59 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60,
                    background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)",
                    borderRadius: 12, padding: 8, minWidth: 200,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
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
                      Todas las cuentas
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
                        {a.label || a.accountId}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          {metaError && (
            <span
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "var(--color-danger)",
              }}
            >
              {metaError}
            </span>
          )}
          <span
            className="text-xs px-3 py-1.5 rounded-full"
            style={{
              background: "rgba(114,85,180,0.12)",
              border: "1px solid rgba(114,85,180,0.3)",
              color: "var(--color-lavender)",
            }}
          >
            META ADS API · LIVE
          </span>
          <button
            onClick={refreshCampaigns}
            disabled={refreshing}
            className="p-2 rounded-lg transition-all"
            style={{
              background: "var(--color-surface-glass)",
              border: "1px solid rgba(114,85,180,0.2)",
              color: "var(--color-text-secondary)",
            }}
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* ── Summary tiles ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <MetricTile label={`Inversión (${periodLabel})`} value={formatCurrency(totals.spent)} icon={DollarSign} />
        <MetricTile label="Alcance" value={formatNumber(totals.reach)} icon={Eye} />
        <MetricTile label="Clics" value={formatNumber(totals.clicks)} icon={MousePointer} />
        <MetricTile label="Vistas landing" value={formatNumber(totals.landingViews)} icon={Target} />
        <MetricTile
          label="Leads"
          value={String(totals.leads)}
          icon={Users}
          sub={totals.leads === 0 ? "Configurar pixel" : undefined}
        />
        <MetricTile
          label="CTR promedio"
          value={formatPercent(totals.avgCTR)}
          icon={TrendingUp}
          alert={totals.avgCTR > 0 && totals.avgCTR < 1.5}
        />
        <MetricTile
          label="CPL promedio"
          value={totals.avgCPL > 0 ? formatCurrency(totals.avgCPL) : "—"}
          icon={Target}
        />
      </div>

      {/* ── Objective summary (multi-objective) ────────────────────────────── */}
      <ObjectiveSummaryBlock groups={objectiveGroups} />

      {/* ── Main: campaign list + detail ───────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Campaign list */}
        <div className="space-y-2">
          {/* List header + count */}
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Campañas ({filteredCampaigns.length}{objectiveFilter ? ` / ${campaigns.length}` : ""})
            </h3>
          </div>

          {/* ── Objective filter buttons ──────────────────────────────────── */}
          {uniqueObjectives.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pb-2">
              {/* "Todas" button */}
              <button
                onClick={() => setObjectiveFilter(null)}
                className="text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all"
                style={{
                  background: objectiveFilter === null ? "rgba(114,85,180,0.3)" : "rgba(22,22,42,0.6)",
                  border: objectiveFilter === null
                    ? "1px solid rgba(114,85,180,0.6)"
                    : "1px solid rgba(114,85,180,0.18)",
                  color: objectiveFilter === null ? "var(--color-text-primary)" : "var(--color-text-muted)",
                }}
              >
                Todas
              </button>

              {uniqueObjectives.map((obj) => {
                const key = obj === "__none__" ? undefined : obj;
                const cfg = getObjectiveConfig(key);
                const isActive = objectiveFilter === obj;
                return (
                  <button
                    key={obj}
                    onClick={() => setObjectiveFilter(isActive ? null : obj)}
                    className="text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all"
                    style={{
                      background: isActive ? `${cfg.color}28` : "rgba(22,22,42,0.6)",
                      border: isActive
                        ? `1px solid ${cfg.color}66`
                        : "1px solid rgba(114,85,180,0.18)",
                      color: isActive ? cfg.color : "var(--color-text-muted)",
                    }}
                  >
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Campaign cards */}
          {filteredCampaigns.length === 0 ? (
            <div className="text-center py-10">
              <Megaphone size={24} className="mx-auto mb-2" style={{ color: "var(--color-text-muted)" }} />
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Sin campañas en esta cuenta</p>
            </div>
          ) : (
            filteredCampaigns.map((c) => {
              const isSelected = c.id === selected;
              const objCfg = getObjectiveConfig(c.objective);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className="w-full text-left p-3.5 rounded-xl transition-all"
                  style={{
                    background: isSelected ? "rgba(43,9,111,0.4)" : "rgba(22,22,42,0.6)",
                    border: `1px solid ${isSelected ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.14)"}`,
                  }}
                >
                  {/* Row 1: name + badges */}
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className="text-sm font-medium leading-snug text-left"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {c.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {c.hasFatigue && (
                        <AlertTriangle size={11} style={{ color: "var(--color-danger)" }} />
                      )}
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: c.status === "active"
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(90,85,117,0.2)",
                          color: c.status === "active" ? "var(--color-success)" : "var(--color-text-secondary)",
                        }}
                      >
                        {c.status === "active" ? "ACTIVA" : "PAUSADA"}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: objective badge */}
                  <div className="mb-2">
                    <ObjectiveBadge objective={c.objective} />
                  </div>

                  {/* Row 3: quick metrics */}
                  <div className="flex flex-wrap gap-2 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    <span>{formatCurrency(c.spent)}</span>
                    <span>·</span>
                    <span>{formatNumber(c.reach)} alcance</span>
                    <span>·</span>
                    <span
                      style={{ color: c.hasFatigue ? "var(--color-danger)" : objCfg.primaryMetrics.includes("ctr") ? objCfg.color : "var(--color-text-secondary)" }}
                    >
                      {formatPercent(c.ctr)} CTR
                    </span>
                    {c.leads > 0 && (
                      <>
                        <span>·</span>
                        <span
                          style={{ color: objCfg.primaryMetrics.includes("leads") ? objCfg.color : "var(--color-text-secondary)" }}
                        >
                          {c.leads} leads
                        </span>
                      </>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* ── Campaign detail ─────────────────────────────────────────────── */}
        <div className="xl:col-span-2 space-y-4">
          {campaign ? (
            <>
              {/* Metrics grid */}
              <div
                className="rounded-xl p-5"
                style={{
                  background: "var(--color-surface-glass)",
                  border: "1px solid rgba(114,85,180,0.18)",
                }}
              >
                {/* Detail header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3
                      className="text-base font-bold leading-snug"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {campaign.name}
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap mt-1.5">
                      <ObjectiveBadge objective={campaign.objective} />
                      {campaign.startDate && (
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          Inicio: {new Date(campaign.startDate).toLocaleDateString("es-PE")}
                        </p>
                      )}
                    </div>
                  </div>
                  {campaign.hasFatigue && (
                    <div
                      className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg flex-shrink-0"
                      style={{
                        background: "rgba(239,68,68,0.08)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "var(--color-danger)",
                      }}
                    >
                      <AlertTriangle size={11} />
                      Fatiga de anuncio
                    </div>
                  )}
                </div>

                {/* Metrics cells — primary metrics highlighted */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-5">
                  {campaignMetrics.map((m) => {
                    const isPrimary = campaignObjCfg.primaryMetrics.includes(m.metricKey);
                    return (
                      <div
                        key={m.label}
                        className="p-2.5 rounded-lg text-center relative"
                        style={{
                          background: isPrimary
                            ? `${campaignObjCfg.color}18`
                            : "rgba(43,9,111,0.18)",
                          border: isPrimary
                            ? `1px solid ${campaignObjCfg.color}44`
                            : "1px solid rgba(114,85,180,0.12)",
                        }}
                      >
                        {isPrimary && (
                          <span
                            className="absolute top-1 right-1 text-[8px]"
                            style={{ color: campaignObjCfg.color, opacity: 0.85 }}
                            title="Métrica principal para este objetivo"
                          >
                            ★
                          </span>
                        )}
                        <div
                          className="text-sm font-bold mb-0.5"
                          style={{
                            color: isPrimary ? campaignObjCfg.color : "var(--color-text-primary)",
                            fontSize: isPrimary ? "1rem" : "0.875rem",
                          }}
                        >
                          {m.value}
                        </div>
                        <div
                          className="text-[10px] uppercase tracking-wide"
                          style={{
                            color: isPrimary ? `${campaignObjCfg.color}99` : "var(--color-text-muted)",
                          }}
                        >
                          {m.label}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chart */}
                {loadingDaily ? (
                  <div className="h-36 flex items-center justify-center">
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Cargando datos diarios...
                    </p>
                  </div>
                ) : errorDaily ? (
                  <ErrorState
                    message="No se pudieron cargar los datos diarios."
                    onRetry={() => selected && loadDailyData(selected, datePreset)}
                  />
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart
                      data={chartData}
                      margin={{ top: 4, right: 0, bottom: 0, left: -20 }}
                    >
                      <defs>
                        <linearGradient id="clicks-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={campaignObjCfg.color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={campaignObjCfg.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,85,180,0.08)" />
                      <XAxis
                        dataKey="day"
                        tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--color-surface-1)",
                          border: "1px solid rgba(114,85,180,0.3)",
                          borderRadius: 8,
                          fontSize: 11,
                          color: "var(--color-text-primary)",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="clicks"
                        stroke={campaignObjCfg.color}
                        strokeWidth={2}
                        fill="url(#clicks-grad)"
                        name="Clics"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    className="h-24 flex items-center justify-center rounded-lg"
                    style={{ background: "rgba(43,9,111,0.1)" }}
                  >
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      Solo datos del día actual disponibles
                    </p>
                  </div>
                )}
              </div>

              {/* ── Hourly leads chart (lead-gen objectives only) ─────── */}
              {isLeadCampaign && (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: "var(--color-surface-glass)",
                    border: "1px solid rgba(34,197,94,0.25)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <h4 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        🕐 Leads por hora del día
                      </h4>
                      <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
                        Distribución horaria acumulada — {periodLabel}
                      </p>
                    </div>
                    {peakHour && peakHour.leads > 0 && (
                      <div
                        className="text-xs px-2.5 py-1.5 rounded-lg"
                        style={{
                          background: "rgba(34,197,94,0.12)",
                          border: "1px solid rgba(34,197,94,0.3)",
                          color: "var(--color-success)",
                        }}
                      >
                        🏆 Pico: {peakHour.label} · {peakHour.leads} leads
                      </div>
                    )}
                  </div>

                  {loadingHourly ? (
                    <div className="h-32 flex items-center justify-center">
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Cargando datos horarios...
                      </p>
                    </div>
                  ) : errorHourly ? (
                    <ErrorState
                      message="No se pudieron cargar los datos por hora."
                      onRetry={() => selected && loadHourlyData(selected, datePreset)}
                    />
                  ) : hourlyData.every((h) => h.leads === 0) ? (
                    <div
                      className="h-24 flex flex-col items-center justify-center rounded-lg mt-3"
                      style={{ background: "rgba(43,9,111,0.1)" }}
                    >
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Sin datos de leads horarios para este período
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "#3a3550" }}>
                        Requiere pixel de Meta configurado
                      </p>
                    </div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={160} style={{ marginTop: 12 }}>
                        <BarChart
                          data={hourlyData}
                          margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
                          barSize={10}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,85,180,0.08)" vertical={false} />
                          <XAxis
                            dataKey="label"
                            tick={{ fontSize: 8, fill: "var(--color-text-muted)" }}
                            tickLine={false}
                            axisLine={false}
                            interval={2}
                          />
                          <YAxis
                            tick={{ fontSize: 9, fill: "var(--color-text-muted)" }}
                            tickLine={false}
                            axisLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "var(--color-surface-1)",
                              border: "1px solid rgba(34,197,94,0.3)",
                              borderRadius: 8,
                              fontSize: 11,
                              color: "var(--color-text-primary)",
                            }}
                            formatter={(value) => [`${value ?? 0} leads`, "Leads"]}
                            labelFormatter={(label) => `Hora: ${label}`}
                          />
                          <Bar dataKey="leads" radius={[3, 3, 0, 0]} name="Leads">
                            {hourlyData.map((entry) => (
                              <Cell
                                key={entry.hour}
                                fill={
                                  peakHour && entry.hour === peakHour.hour
                                    ? "var(--color-success)"
                                    : entry.leads > 0
                                      ? "rgba(34,197,94,0.55)"
                                      : "rgba(34,197,94,0.12)"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      {peakHour && peakHour.leads > 0 && (
                        <p className="text-[10px] mt-2" style={{ color: "var(--color-text-muted)" }}>
                          💡 La mayoría de tus leads llegan a las <strong style={{ color: "var(--color-success)" }}>{peakHour.label}</strong>. Considera programar tus presupuestos y respuestas para ese horario.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ── Ad Sets section ──────────────────────────────────────── */}
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: "var(--color-surface-glass)",
                  border: "1px solid rgba(114,85,180,0.18)",
                }}
              >
                <button
                  onClick={() => {
                    if (!showAdsets) {
                      loadAdsets(campaign.id, datePreset);
                    } else {
                      setShowAdsets(false);
                      setShowAds(false);
                      setAds([]);
                      setSelectedAdset(null);
                    }
                  }}
                  className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/3"
                  style={{
                    borderBottom: showAdsets ? "1px solid rgba(114,85,180,0.12)" : "none",
                  }}
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    Ad Sets ({showAdsets ? adsets.length : "…"})
                  </span>
                  {showAdsets
                    ? <ChevronUp size={14} style={{ color: "var(--color-text-muted)" }} />
                    : <ChevronDown size={14} style={{ color: "var(--color-text-muted)" }} />}
                </button>

                {showAdsets && (
                  <div>
                    {loadingAdsets ? (
                      <div className="p-5 text-center">
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                          Cargando ad sets...
                        </p>
                      </div>
                    ) : errorAdsets ? (
                      <ErrorState
                        message="No se pudieron cargar los ad sets."
                        onRetry={() => selected && loadAdsets(selected, datePreset)}
                      />
                    ) : adsets.length === 0 ? (
                      <div className="p-5 text-center">
                        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Sin ad sets</p>
                      </div>
                    ) : (
                      <div>
                        {/* Table header */}
                        <div
                          className="grid grid-cols-7 gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          <span className="col-span-2">Ad Set</span>
                          <span className="text-right">Gasto</span>
                          <span className="text-right">Alcance</span>
                          <span className="text-right">Clics</span>
                          <span className="text-right">CTR</span>
                          <span className="text-right">Anuncios</span>
                        </div>
                        {adsets.map((a) => (
                          <div
                            key={a.id}
                            className="grid grid-cols-7 gap-2 px-5 py-3 items-center"
                            style={{ borderTop: "1px solid rgba(114,85,180,0.08)" }}
                          >
                            <div className="col-span-2">
                              <p
                                className="text-xs font-medium leading-snug"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                {a.name}
                              </p>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                                style={{
                                  background: a.status === "active"
                                    ? "rgba(34,197,94,0.12)"
                                    : "rgba(90,85,117,0.12)",
                                  color: a.status === "active" ? "var(--color-success)" : "var(--color-text-secondary)",
                                }}
                              >
                                {a.status === "active" ? "ACTIVO" : "PAUSADO"}
                              </span>
                            </div>
                            <span
                              className="text-xs text-right font-medium"
                              style={{ color: "var(--color-text-primary)" }}
                            >
                              {formatCurrency(a.spend)}
                            </span>
                            <span className="text-xs text-right" style={{ color: "var(--color-text-secondary)" }}>
                              {formatNumber(a.reach)}
                            </span>
                            <span className="text-xs text-right" style={{ color: "var(--color-text-secondary)" }}>
                              {formatNumber(a.clicks)}
                            </span>
                            <span
                              className="text-xs text-right"
                              style={{
                                color: a.ctr > 0 && a.ctr < 1.5 ? "var(--color-danger)" : "var(--color-text-secondary)",
                              }}
                            >
                              {formatPercent(a.ctr)}
                            </span>
                            <div className="flex justify-end">
                              <button
                                onClick={() => {
                                  if (selectedAdset === a.id && showAds) {
                                    setShowAds(false);
                                    setSelectedAdset(null);
                                    setAds([]);
                                  } else {
                                    loadAds(a.id, datePreset);
                                  }
                                }}
                                className="text-[10px] px-2 py-1 rounded-md transition-all"
                                style={{
                                  background: selectedAdset === a.id && showAds
                                    ? "rgba(114,85,180,0.3)"
                                    : "rgba(22,22,42,0.6)",
                                  border: selectedAdset === a.id && showAds
                                    ? "1px solid rgba(114,85,180,0.5)"
                                    : "1px solid rgba(114,85,180,0.2)",
                                  color: selectedAdset === a.id && showAds
                                    ? "var(--color-text-primary)"
                                    : "var(--color-text-secondary)",
                                }}
                              >
                                Ver
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── Ads section ──────────────────────────────────────────── */}
              {showAds && (
                <div
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: "var(--color-surface-glass)",
                    border: "1px solid rgba(114,85,180,0.18)",
                  }}
                >
                  <div
                    className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: "1px solid rgba(114,85,180,0.12)" }}
                  >
                    <span className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                      Anuncios ({loadingAds ? "…" : ads.length})
                    </span>
                    <button
                      onClick={() => {
                        setShowAds(false);
                        setSelectedAdset(null);
                        setAds([]);
                      }}
                      className="p-1 rounded-md"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      <ChevronUp size={14} />
                    </button>
                  </div>

                  {loadingAds ? (
                    <div className="p-5 text-center">
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Cargando anuncios...
                      </p>
                    </div>
                  ) : errorAds ? (
                    <ErrorState
                      message="No se pudieron cargar los anuncios."
                      onRetry={() => selectedAdset && loadAds(selectedAdset, datePreset)}
                    />
                  ) : ads.length === 0 ? (
                    <div className="p-5 text-center">
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                        Sin anuncios en este ad set
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Ads table header */}
                      <div
                        className="grid grid-cols-8 gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        <span className="col-span-3">Anuncio</span>
                        <span className="text-right">Gasto</span>
                        <span className="text-right">Alcance</span>
                        <span className="text-right">Clics</span>
                        <span className="text-right">CTR</span>
                        <span className="text-right">CPM</span>
                      </div>
                      {ads.map((ad) => (
                        <div
                          key={ad.id}
                          className="grid grid-cols-8 gap-2 px-5 py-3 items-center"
                          style={{ borderTop: "1px solid rgba(114,85,180,0.08)" }}
                        >
                          {/* Thumbnail + name */}
                          <div className="col-span-3 flex items-start gap-3">
                            <div
                              className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                              style={{
                                background: "rgba(43,9,111,0.2)",
                                border: "1px solid rgba(114,85,180,0.15)",
                              }}
                            >
                              {ad.creative?.thumbnailUrl ? (
                                <img
                                  src={ad.creative.thumbnailUrl}
                                  alt={ad.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video size={20} style={{ color: "var(--color-text-muted)" }} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-xs font-medium leading-snug mb-1"
                                style={{ color: "var(--color-text-primary)" }}
                              >
                                {ad.name}
                              </p>
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full inline-block mb-1"
                                style={{
                                  background: ad.status === "active"
                                    ? "rgba(34,197,94,0.12)"
                                    : "rgba(90,85,117,0.12)",
                                  color: ad.status === "active" ? "var(--color-success)" : "var(--color-text-secondary)",
                                }}
                              >
                                {ad.status === "active" ? "ACTIVO" : "PAUSADO"}
                              </span>
                              {ad.creative?.body && (
                                <p
                                  className="text-[10px] leading-snug"
                                  style={{ color: "var(--color-text-muted)" }}
                                >
                                  {ad.creative.body.length > 80
                                    ? `${ad.creative.body.slice(0, 80)}…`
                                    : ad.creative.body}
                                </p>
                              )}
                            </div>
                          </div>

                          <span
                            className="text-xs text-right font-medium"
                            style={{ color: "var(--color-text-primary)" }}
                          >
                            {formatCurrency(ad.spend)}
                          </span>
                          <span className="text-xs text-right" style={{ color: "var(--color-text-secondary)" }}>
                            {formatNumber(ad.reach)}
                          </span>
                          <span className="text-xs text-right" style={{ color: "var(--color-text-secondary)" }}>
                            {formatNumber(ad.clicks)}
                          </span>
                          <span
                            className="text-xs text-right"
                            style={{
                              color: ad.ctr > 0 && ad.ctr < 1.5 ? "var(--color-danger)" : "var(--color-text-secondary)",
                            }}
                          >
                            {formatPercent(ad.ctr)}
                          </span>
                          <span className="text-xs text-right" style={{ color: "var(--color-text-secondary)" }}>
                            {formatCurrency(ad.cpm)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── Fatigue alert ─────────────────────────────────────────── */}
              {campaign.hasFatigue && (
                <div
                  className="rounded-xl p-4 flex gap-3"
                  style={{
                    background: "rgba(239,68,68,0.07)",
                    border: "1px solid rgba(239,68,68,0.25)",
                  }}
                >
                  <AlertTriangle
                    size={16}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: "var(--color-danger)" }}
                  />
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: "var(--color-danger)" }}>
                      Posible fatiga de anuncio
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      CTR de {formatPercent(campaign.ctr)} está por debajo del benchmark (1.5%). Considera renovar los creativos o ajustar la segmentación.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              className="rounded-xl p-10 text-center"
              style={{
                background: "var(--color-surface-glass)",
                border: "1px solid rgba(114,85,180,0.18)",
              }}
            >
              <Megaphone size={28} className="mx-auto mb-3" style={{ color: "var(--color-text-muted)" }} />
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Selecciona una campaña para ver métricas
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
