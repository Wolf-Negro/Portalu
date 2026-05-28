"use client";

import { useState, useEffect } from "react";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Megaphone, TrendingUp, AlertTriangle, DollarSign,
  Users, Target, Eye, Play, Pause, RefreshCw,
  ChevronDown, ChevronUp, Video, MousePointer,
} from "lucide-react";
import { formatCurrency, formatNumber, formatPercent } from "@/lib/utils";

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

const PERIOD_OPTIONS: { label: string; value: string }[] = [
  { label: "7d", value: "last_7d" },
  { label: "14d", value: "last_14d" },
  { label: "30d", value: "last_30d" },
  { label: "Este mes", value: "this_month" },
  { label: "Mes anterior", value: "last_month" },
];

function MetricTile({ label, value, icon: Icon, alert, sub }: {
  label: string; value: string; icon: React.ElementType; alert?: boolean; sub?: string;
}) {
  return (
    <div className="rounded-xl p-4"
      style={{
        background: alert ? "rgba(239,68,68,0.07)" : "rgba(22,22,42,0.8)",
        border: `1px solid ${alert ? "rgba(239,68,68,0.28)" : "rgba(114,85,180,0.18)"}`,
      }}>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#5a5575" }}>{label}</span>
        {alert
          ? <AlertTriangle size={13} style={{ color: "#ef4444" }} />
          : <Icon size={13} style={{ color: "#7255b4" }} />
        }
      </div>
      <div className="text-xl font-bold" style={{ color: alert ? "#ef4444" : "#e9e8e6" }}>{value}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: "#5a5575" }}>{sub}</div>}
    </div>
  );
}

export default function CampanasClient({
  campaigns: initialCampaigns,
  metaError,
}: {
  campaigns: Campaign[];
  metaError?: string;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [selected, setSelected] = useState<string | null>(initialCampaigns[0]?.id || null);
  const [adsets, setAdsets] = useState<AdSet[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [loadingAdsets, setLoadingAdsets] = useState(false);
  const [loadingDaily, setLoadingDaily] = useState(false);
  const [showAdsets, setShowAdsets] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Period state
  const [datePreset, setDatePreset] = useState("last_30d");

  // Ads state
  const [ads, setAds] = useState<Ad[]>([]);
  const [loadingAds, setLoadingAds] = useState(false);
  const [showAds, setShowAds] = useState(false);
  const [selectedAdset, setSelectedAdset] = useState<string | null>(null);

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
  }, [selected]);

  // When datePreset changes, reload everything
  useEffect(() => {
    if (selected) loadDailyData(selected, datePreset);
    refreshCampaignsWithPreset(datePreset);
    if (showAdsets && selected) loadAdsets(selected, datePreset);
    if (showAds && selectedAdset) loadAds(selectedAdset, datePreset);
  }, [datePreset]);

  async function loadDailyData(campaignId: string, preset: string = datePreset) {
    setLoadingDaily(true);
    try {
      const res = await fetch(`/api/meta/daily?campaign_id=${campaignId}&date_preset=${preset}`);
      const data = await res.json();
      setDailyData(data.daily || []);
    } catch {}
    setLoadingDaily(false);
  }

  async function loadAdsets(campaignId: string, preset: string = datePreset) {
    setLoadingAdsets(true);
    setShowAdsets(true);
    try {
      const res = await fetch(`/api/meta/adsets?campaign_id=${campaignId}&date_preset=${preset}`);
      const data = await res.json();
      setAdsets(data.adsets || []);
    } catch {}
    setLoadingAdsets(false);
  }

  async function loadAds(adsetId: string, preset: string = datePreset) {
    setLoadingAds(true);
    setShowAds(true);
    setSelectedAdset(adsetId);
    try {
      const res = await fetch(`/api/meta/ads?adset_id=${adsetId}&date_preset=${preset}`);
      const data = await res.json();
      setAds(data.ads || []);
    } catch {}
    setLoadingAds(false);
  }

  async function refreshCampaignsWithPreset(preset: string) {
    try {
      const res = await fetch(`/api/meta/campaigns?date_preset=${preset}`);
      const data = await res.json();
      if (data.campaigns) setCampaigns(data.campaigns);
    } catch {}
  }

  async function refreshCampaigns() {
    setRefreshing(true);
    await refreshCampaignsWithPreset(datePreset);
    setRefreshing(false);
  }

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
    ? dailyData.slice(-14).map((d) => ({
        day: new Date(d.date).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" }),
        clicks: d.clicks,
        spend: d.spend,
        leads: d.leads,
        ctr: d.ctr,
      }))
    : [];

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === datePreset)?.label || "30d";

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#e9e8e6" }}>Campañas Meta Ads</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a09bbf" }}>
            Publicidad Consultora Alucinando · PEN · Lima
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period filter */}
          <div className="flex items-center gap-1 rounded-lg p-1"
            style={{ background: "rgba(22,22,42,0.6)", border: "1px solid rgba(114,85,180,0.18)" }}>
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
                    color: isActive ? "#e9e8e6" : "#a09bbf",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {metaError && (
            <span className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
              {metaError}
            </span>
          )}
          <span className="text-xs px-3 py-1.5 rounded-full"
            style={{ background: "rgba(114,85,180,0.12)", border: "1px solid rgba(114,85,180,0.3)", color: "#7255b4" }}>
            META ADS API · LIVE
          </span>
          <button
            onClick={refreshCampaigns}
            disabled={refreshing}
            className="p-2 rounded-lg transition-all"
            style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.2)", color: "#a09bbf" }}
            title="Actualizar datos"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        <MetricTile label={`Inversión (${periodLabel})`} value={formatCurrency(totals.spent)} icon={DollarSign} />
        <MetricTile label="Alcance" value={formatNumber(totals.reach)} icon={Eye} />
        <MetricTile label="Clics" value={formatNumber(totals.clicks)} icon={MousePointer} />
        <MetricTile label="Vistas landing" value={formatNumber(totals.landingViews)} icon={Target} />
        <MetricTile label="Leads" value={String(totals.leads)} icon={Users}
          sub={totals.leads === 0 ? "Configurar pixel" : undefined} />
        <MetricTile label="CTR promedio" value={formatPercent(totals.avgCTR)} icon={TrendingUp}
          alert={totals.avgCTR > 0 && totals.avgCTR < 1.5} />
        <MetricTile label="CPL promedio" value={totals.avgCPL > 0 ? formatCurrency(totals.avgCPL) : "—"} icon={Target} />
      </div>

      {/* Main: campaign list + detail */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Campaign list */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold mb-3" style={{ color: "#e9e8e6" }}>
            Campañas ({campaigns.length})
          </h3>
          {campaigns.length === 0 ? (
            <div className="text-center py-10">
              <Megaphone size={24} className="mx-auto mb-2" style={{ color: "#5a5575" }} />
              <p className="text-xs" style={{ color: "#5a5575" }}>Sin campañas en esta cuenta</p>
            </div>
          ) : (
            campaigns.map((c) => {
              const isSelected = c.id === selected;
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
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-sm font-medium leading-snug text-left" style={{ color: "#e9e8e6" }}>
                      {c.name}
                    </span>
                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                      {c.hasFatigue && <AlertTriangle size={11} style={{ color: "#ef4444" }} />}
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{
                          background: c.status === "active" ? "rgba(34,197,94,0.15)" : "rgba(90,85,117,0.2)",
                          color: c.status === "active" ? "#22c55e" : "#a09bbf",
                        }}>
                        {c.status === "active" ? "ACTIVA" : "PAUSADA"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs" style={{ color: "#5a5575" }}>
                    <span>{formatCurrency(c.spent)}</span>
                    <span>·</span>
                    <span>{formatNumber(c.reach)} alcance</span>
                    <span>·</span>
                    <span style={{ color: c.hasFatigue ? "#ef4444" : "#a09bbf" }}>
                      {formatPercent(c.ctr)} CTR
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Campaign detail */}
        <div className="xl:col-span-2 space-y-4">
          {campaign ? (
            <>
              {/* Metrics grid */}
              <div className="rounded-xl p-5"
                style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold leading-snug" style={{ color: "#e9e8e6" }}>
                      {campaign.name}
                    </h3>
                    {campaign.startDate && (
                      <p className="text-xs mt-1" style={{ color: "#5a5575" }}>
                        Inicio: {new Date(campaign.startDate).toLocaleDateString("es-PE")}
                        {campaign.objective && ` · ${campaign.objective.replace("OUTCOME_", "")}`}
                      </p>
                    )}
                  </div>
                  {campaign.hasFatigue && (
                    <div className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg flex-shrink-0"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444" }}>
                      <AlertTriangle size={11} />
                      Fatiga de anuncio
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mb-5">
                  {[
                    { label: "Inversión", value: formatCurrency(campaign.spent) },
                    { label: "Alcance", value: formatNumber(campaign.reach) },
                    { label: "Impresiones", value: formatNumber(campaign.impressions) },
                    { label: "Clics totales", value: formatNumber(campaign.clicks) },
                    { label: "Clics enlace", value: formatNumber(campaign.linkClicks) },
                    { label: "Vistas landing", value: formatNumber(campaign.landingViews) },
                    { label: "Video views", value: formatNumber(campaign.videoViews) },
                    { label: "CTR", value: formatPercent(campaign.ctr) },
                    { label: "CPM", value: formatCurrency(campaign.cpm) },
                    { label: "Frecuencia", value: `${campaign.frequency}x` },
                    { label: "Leads", value: campaign.leads > 0 ? String(campaign.leads) : "—" },
                    {
                      label: "CPL",
                      value: campaign.cpl > 0 ? formatCurrency(campaign.cpl) : "—",
                    },
                  ].map((m) => (
                    <div key={m.label} className="p-2.5 rounded-lg text-center"
                      style={{ background: "rgba(43,9,111,0.18)", border: "1px solid rgba(114,85,180,0.12)" }}>
                      <div className="text-sm font-bold mb-0.5" style={{ color: "#e9e8e6" }}>{m.value}</div>
                      <div className="text-[10px] uppercase tracking-wide" style={{ color: "#5a5575" }}>{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Chart */}
                {loadingDaily ? (
                  <div className="h-36 flex items-center justify-center">
                    <p className="text-xs" style={{ color: "#5a5575" }}>Cargando datos diarios...</p>
                  </div>
                ) : chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={chartData} margin={{ top: 4, right: 0, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="clicks-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7255b4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7255b4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,85,180,0.08)" />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fill: "#5a5575" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#5a5575" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{
                        background: "#141420", border: "1px solid rgba(114,85,180,0.3)",
                        borderRadius: 8, fontSize: 11, color: "#e9e8e6",
                      }} />
                      <Area type="monotone" dataKey="clicks" stroke="#7255b4" strokeWidth={2}
                        fill="url(#clicks-grad)" name="Clics" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-24 flex items-center justify-center rounded-lg"
                    style={{ background: "rgba(43,9,111,0.1)" }}>
                    <p className="text-xs" style={{ color: "#5a5575" }}>
                      Solo datos del día actual disponibles
                    </p>
                  </div>
                )}
              </div>

              {/* Ad Sets section */}
              <div className="rounded-xl overflow-hidden"
                style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
                <button
                  onClick={() => {
                    if (!showAdsets) loadAdsets(campaign.id, datePreset);
                    else {
                      setShowAdsets(false);
                      setShowAds(false);
                      setAds([]);
                      setSelectedAdset(null);
                    }
                  }}
                  className="w-full flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/3"
                  style={{ borderBottom: showAdsets ? "1px solid rgba(114,85,180,0.12)" : "none" }}
                >
                  <span className="text-sm font-semibold" style={{ color: "#e9e8e6" }}>
                    Ad Sets ({showAdsets ? adsets.length : "…"})
                  </span>
                  {showAdsets ? <ChevronUp size={14} style={{ color: "#5a5575" }} /> : <ChevronDown size={14} style={{ color: "#5a5575" }} />}
                </button>

                {showAdsets && (
                  <div>
                    {loadingAdsets ? (
                      <div className="p-5 text-center">
                        <p className="text-xs" style={{ color: "#5a5575" }}>Cargando ad sets...</p>
                      </div>
                    ) : adsets.length === 0 ? (
                      <div className="p-5 text-center">
                        <p className="text-xs" style={{ color: "#5a5575" }}>Sin ad sets</p>
                      </div>
                    ) : (
                      <div>
                        {/* Header */}
                        <div className="grid grid-cols-7 gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: "#5a5575" }}>
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
                              <p className="text-xs font-medium leading-snug" style={{ color: "#e9e8e6" }}>{a.name}</p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                                style={{
                                  background: a.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(90,85,117,0.12)",
                                  color: a.status === "active" ? "#22c55e" : "#a09bbf",
                                }}>
                                {a.status === "active" ? "ACTIVO" : "PAUSADO"}
                              </span>
                            </div>
                            <span className="text-xs text-right font-medium" style={{ color: "#e9e8e6" }}>
                              {formatCurrency(a.spend)}
                            </span>
                            <span className="text-xs text-right" style={{ color: "#a09bbf" }}>
                              {formatNumber(a.reach)}
                            </span>
                            <span className="text-xs text-right" style={{ color: "#a09bbf" }}>
                              {formatNumber(a.clicks)}
                            </span>
                            <span className="text-xs text-right"
                              style={{ color: a.ctr > 0 && a.ctr < 1.5 ? "#ef4444" : "#a09bbf" }}>
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
                                  color: selectedAdset === a.id && showAds ? "#e9e8e6" : "#a09bbf",
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

              {/* Ads section */}
              {showAds && (
                <div className="rounded-xl overflow-hidden"
                  style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
                  <div className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: "1px solid rgba(114,85,180,0.12)" }}>
                    <span className="text-sm font-semibold" style={{ color: "#e9e8e6" }}>
                      Anuncios ({loadingAds ? "…" : ads.length})
                    </span>
                    <button
                      onClick={() => { setShowAds(false); setSelectedAdset(null); setAds([]); }}
                      className="p-1 rounded-md"
                      style={{ color: "#5a5575" }}
                    >
                      <ChevronUp size={14} />
                    </button>
                  </div>

                  {loadingAds ? (
                    <div className="p-5 text-center">
                      <p className="text-xs" style={{ color: "#5a5575" }}>Cargando anuncios...</p>
                    </div>
                  ) : ads.length === 0 ? (
                    <div className="p-5 text-center">
                      <p className="text-xs" style={{ color: "#5a5575" }}>Sin anuncios en este ad set</p>
                    </div>
                  ) : (
                    <div>
                      {/* Ads header */}
                      <div className="grid grid-cols-8 gap-2 px-5 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "#5a5575" }}>
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
                            <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden"
                              style={{ background: "rgba(43,9,111,0.2)", border: "1px solid rgba(114,85,180,0.15)" }}>
                              {ad.creative?.thumbnailUrl ? (
                                <img
                                  src={ad.creative.thumbnailUrl}
                                  alt={ad.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Video size={20} style={{ color: "#5a5575" }} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium leading-snug mb-1" style={{ color: "#e9e8e6" }}>
                                {ad.name}
                              </p>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full inline-block mb-1"
                                style={{
                                  background: ad.status === "active" ? "rgba(34,197,94,0.12)" : "rgba(90,85,117,0.12)",
                                  color: ad.status === "active" ? "#22c55e" : "#a09bbf",
                                }}>
                                {ad.status === "active" ? "ACTIVO" : "PAUSADO"}
                              </span>
                              {ad.creative?.body && (
                                <p className="text-[10px] leading-snug" style={{ color: "#5a5575" }}>
                                  {ad.creative.body.length > 80
                                    ? `${ad.creative.body.slice(0, 80)}…`
                                    : ad.creative.body}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="text-xs text-right font-medium" style={{ color: "#e9e8e6" }}>
                            {formatCurrency(ad.spend)}
                          </span>
                          <span className="text-xs text-right" style={{ color: "#a09bbf" }}>
                            {formatNumber(ad.reach)}
                          </span>
                          <span className="text-xs text-right" style={{ color: "#a09bbf" }}>
                            {formatNumber(ad.clicks)}
                          </span>
                          <span className="text-xs text-right"
                            style={{ color: ad.ctr > 0 && ad.ctr < 1.5 ? "#ef4444" : "#a09bbf" }}>
                            {formatPercent(ad.ctr)}
                          </span>
                          <span className="text-xs text-right" style={{ color: "#a09bbf" }}>
                            {formatCurrency(ad.cpm)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Fatigue alert */}
              {campaign.hasFatigue && (
                <div className="rounded-xl p-4 flex gap-3"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}>
                  <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
                  <div>
                    <p className="text-sm font-semibold mb-0.5" style={{ color: "#ef4444" }}>
                      Posible fatiga de anuncio
                    </p>
                    <p className="text-xs" style={{ color: "#a09bbf" }}>
                      CTR de {formatPercent(campaign.ctr)} está por debajo del benchmark (1.5%). Considera renovar los creativos o ajustar la segmentación.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="rounded-xl p-10 text-center"
              style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
              <Megaphone size={28} className="mx-auto mb-3" style={{ color: "#5a5575" }} />
              <p className="text-sm" style={{ color: "#5a5575" }}>Selecciona una campaña para ver métricas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
