import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";
import { getMetaCredentials, getAllMetaAdAccounts } from "@/lib/meta-credentials";

// ─── MetaData interface ────────────────────────────────────────────────────────

export interface MetaData {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
  outboundClicks: number;
  landingPageViews: number;
  leads: number;
  purchases: number;
  purchaseValue: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  videoViews: number;
  videoP25: number;
  videoP50: number;
  videoP75: number;
  videoP100: number;
  postEngagement: number;
  postReactions: number;
  postComments: number;
  postShares: number;
  messages: number;
  // computed
  cpl: number;
  roas: number;
  costPerLandingPageView: number;
}

// ─── Helper: parse an actions array by action_type ────────────────────────────

function sumActions(
  actions: { action_type: string; value: string }[],
  types: string[]
): number {
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((acc, a) => acc + parseFloat(a.value ?? "0"), 0);
}

// Meta reporta el MISMO evento de conversión bajo varias action_type a la
// vez (ej. un lead vía pixel aparece como "lead", "offsite_conversion.fb_pixel_lead"
// y "onsite_web_lead" simultáneamente, todos con el mismo valor) — sumarlos
// duplica el conteo. Se toma el máximo entre los tipos candidatos, no la suma.
function maxAction(
  actions: { action_type: string; value: string }[],
  types: string[]
): number {
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((max, a) => Math.max(max, parseFloat(a.value ?? "0")), 0);
}

// ─── fetchMetaFull ─────────────────────────────────────────────────────────────

interface MetaFetchResult {
  data: MetaData | null;
  status: "ok" | "no_credentials" | "error";
}

async function fetchOneAccountFull(
  token: string,
  rawAccount: string,
  period: "today" | "last_7d" | "last_30d" | "yesterday"
): Promise<MetaData | null> {
  try {
    const account = rawAccount.startsWith("act_") ? rawAccount : `act_${rawAccount}`;

    const fields = [
      "spend",
      "reach",
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "cpm",
      "frequency",
      "actions",
      "action_values",
      "outbound_clicks",
      "video_p25_watched_actions",
      "video_p50_watched_actions",
      "video_p75_watched_actions",
      "video_p100_watched_actions",
    ].join(",");

    const url =
      `https://graph.facebook.com/v21.0/${account}/insights` +
      `?fields=${fields}` +
      `&date_preset=${period}` +
      `&action_attribution_windows=["7d_click","1d_view"]` +
      `&use_unified_attribution_setting=true` +
      `&access_token=${token}`;

    const fetchOptions =
      period === "today" || period === "yesterday"
        ? { cache: "no-store" as const }
        : { next: { revalidate: 300 } };
    const res = await fetch(url, fetchOptions);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.error) return null;
    const data = json?.data?.[0];
    if (!data) return null;

    const actions: { action_type: string; value: string }[] =
      (data.actions as { action_type: string; value: string }[] | undefined) ?? [];
    const actionValues: { action_type: string; value: string }[] =
      (data.action_values as { action_type: string; value: string }[] | undefined) ?? [];

    const leads = maxAction(actions, [
      "lead",
      "onsite_conversion.lead_grouped",
      "offsite_conversion.fb_pixel_lead",
    ]);
    const purchases = maxAction(actions, [
      "purchase",
      "offsite_conversion.fb_pixel_purchase",
    ]);
    const purchaseValue = sumActions(actionValues, ["purchase"]);
    const landingPageViews = sumActions(actions, ["landing_page_view"]);
    const linkClicks = sumActions(actions, ["link_click"]);
    const videoViews = sumActions(actions, ["video_view"]);
    const postEngagement = sumActions(actions, ["post_engagement"]);
    const postReactions = sumActions(actions, ["post_reaction", "like"]);
    const postComments = sumActions(actions, ["comment"]);
    const postShares = sumActions(actions, ["post"]);
    const messages = sumActions(actions, ["onsite_conversion.messaging_conversation_started_7d"]);

    const outboundClicks = parseFloat(
      (data.outbound_clicks as { value: string }[] | undefined)?.[0]?.value ?? "0"
    );
    const videoP25 = parseFloat(
      (data.video_p25_watched_actions as { value: string }[] | undefined)?.[0]?.value ?? "0"
    );
    const videoP50 = parseFloat(
      (data.video_p50_watched_actions as { value: string }[] | undefined)?.[0]?.value ?? "0"
    );
    const videoP75 = parseFloat(
      (data.video_p75_watched_actions as { value: string }[] | undefined)?.[0]?.value ?? "0"
    );
    const videoP100 = parseFloat(
      (data.video_p100_watched_actions as { value: string }[] | undefined)?.[0]?.value ?? "0"
    );

    const spend = parseFloat(data.spend ?? "0");
    const cpl = leads > 0 ? spend / leads : 0;
    const roas = spend > 0 ? purchaseValue / spend : 0;
    const costPerLandingPageView = landingPageViews > 0 ? spend / landingPageViews : 0;

    return {
      spend,
      reach: parseInt(data.reach ?? "0", 10),
      impressions: parseInt(data.impressions ?? "0", 10),
      clicks: parseInt(data.clicks ?? "0", 10),
      linkClicks,
      outboundClicks,
      landingPageViews,
      leads,
      purchases,
      purchaseValue,
      ctr: parseFloat(data.ctr ?? "0"),
      cpc: parseFloat(data.cpc ?? "0"),
      cpm: parseFloat(data.cpm ?? "0"),
      frequency: parseFloat(data.frequency ?? "0"),
      videoViews,
      videoP25,
      videoP50,
      videoP75,
      videoP100,
      postEngagement,
      postReactions,
      postComments,
      postShares,
      messages,
      cpl,
      roas,
      costPerLandingPageView,
    };
  } catch {
    return null;
  }
}

// Suma las métricas de varias cuentas publicitarias (modo "combinado") y
// recalcula las tasas a partir de los totales en vez de promediarlas.
function aggregateMetaData(list: MetaData[]): MetaData {
  const sum = (key: keyof MetaData) => list.reduce((acc, m) => acc + (m[key] as number), 0);
  const spend = sum("spend");
  const clicks = sum("clicks");
  const impressions = sum("impressions");
  const leads = sum("leads");
  const purchaseValue = sum("purchaseValue");
  const landingPageViews = sum("landingPageViews");

  return {
    spend,
    reach: sum("reach"),
    impressions,
    clicks,
    linkClicks: sum("linkClicks"),
    outboundClicks: sum("outboundClicks"),
    landingPageViews,
    leads,
    purchases: sum("purchases"),
    purchaseValue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    frequency: list.length > 0 ? list.reduce((acc, m) => acc + m.frequency, 0) / list.length : 0,
    videoViews: sum("videoViews"),
    videoP25: sum("videoP25"),
    videoP50: sum("videoP50"),
    videoP75: sum("videoP75"),
    videoP100: sum("videoP100"),
    postEngagement: sum("postEngagement"),
    postReactions: sum("postReactions"),
    postComments: sum("postComments"),
    postShares: sum("postShares"),
    messages: sum("messages"),
    cpl: leads > 0 ? spend / leads : 0,
    roas: spend > 0 ? purchaseValue / spend : 0,
    costPerLandingPageView: landingPageViews > 0 ? spend / landingPageViews : 0,
  };
}

/** Sin `accountId`, combina todas las cuentas publicitarias de la empresa. */
async function fetchMetaFull(
  companyId: string | undefined,
  period: "today" | "last_7d" | "last_30d" | "yesterday",
  accountId?: string
): Promise<MetaFetchResult> {
  try {
    if (accountId) {
      const { token, account } = await getMetaCredentials(companyId, accountId);
      if (!token || !account) return { data: null, status: "no_credentials" };
      const data = await fetchOneAccountFull(token, account, period);
      return { data, status: data ? "ok" : "error" };
    }

    const accounts = await getAllMetaAdAccounts(companyId);
    if (accounts.length === 0) return { data: null, status: "no_credentials" };

    const results = await Promise.allSettled(
      accounts.map((a) => fetchOneAccountFull(a.accessToken, a.accountId, period))
    );
    const dataList = results
      .filter((r): r is PromiseFulfilledResult<MetaData | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((d): d is MetaData => d !== null);

    if (dataList.length === 0) return { data: null, status: "ok" };
    return { data: aggregateMetaData(dataList), status: "ok" };
  } catch {
    return { data: null, status: "error" };
  }
}

function buildPerformanceData(leads: { createdAt: Date }[], opportunities: { createdAt: Date; stage: string }[]) {
  const days: { day: string; date: Date; leads: number; ventas: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    days.push({
      day: d.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit" }),
      date: d,
      leads: 0,
      ventas: 0,
    });
  }

  for (const lead of leads) {
    const d = new Date(lead.createdAt);
    d.setHours(0, 0, 0, 0);
    const found = days.find((x) => x.date.toDateString() === d.toDateString());
    if (found) found.leads++;
  }

  for (const opp of opportunities) {
    if (opp.stage === "cerrado_ganado") {
      const d = new Date(opp.createdAt);
      d.setHours(0, 0, 0, 0);
      const found = days.find((x) => x.date.toDateString() === d.toDateString());
      if (found) found.ventas++;
    }
  }

  return days.map(({ day, leads, ventas }) => ({ day, leads, ventas }));
}

const ORIGIN_COLORS: Record<string, string> = {
  meta_ads: "#1877f2",
  whatsapp: "#25d366",
  formulario: "var(--color-lavender)",
  landing: "var(--color-coral)",
  otros: "var(--color-text-muted)",
  google: "#ea4335",
};

const ORIGIN_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  whatsapp: "WhatsApp",
  formulario: "Formulario",
  landing: "Landing Page",
  otros: "Otros",
  google: "Google",
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string;
  // companyId puede venir null (no solo undefined) si el usuario en BD no
  // tiene empresa asignada (ej. superadmin) — normalizamos para que Prisma
  // lo omita del where en vez de fallar con "must not be null".
  const companyId = ((session?.user as any)?.companyId as string | null | undefined) ?? undefined;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [dbUser, company] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true, name: true } as any,
    }),
    companyId ? prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }) : null,
  ]);

  const preferences = (dbUser as any)?.preferences
    ? JSON.parse((dbUser as any).preferences)
    : { platforms: ["meta_ads"], metrics: ["cpl", "conversion"], goal: "aumentar_leads", widgets: ["campanas_meta", "pipeline", "alertas", "actividad"] };

  const [
    totalLeads,
    newLeads,
    recentLeads,
    opportunities,
    recentOpps,
    leadsByOriginRaw,
    recentActivities,
    alerts,
    weeklySummary,
    teamStats,
  ] = await Promise.all([
    prisma.lead.count({ where: { companyId } }),
    prisma.lead.count({ where: { companyId, status: "nuevo" } }),
    prisma.lead.findMany({
      where: { companyId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.opportunity.findMany({ where: { companyId } }),
    prisma.opportunity.findMany({
      where: { companyId, createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true, stage: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.lead.groupBy({
      by: ["origin" as any],
      where: { companyId },
      _count: { _all: true },
    }),
    prisma.activity.findMany({
      where: companyId ? { lead: { companyId } } : {},
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } }, lead: { select: { name: true } } },
    }),
    prisma.alert.count({ where: { companyId, read: false } }),
    prisma.weeklySummary.findFirst({
      where: { companyId },
      orderBy: { weekStart: "desc" },
    }),
    prisma.user.findMany({
      where: { companyId, role: { in: ["asesor", "supervisor"] } },
      select: { id: true, name: true, role: true, leadsAssigned: { select: { id: true, status: true } } },
      take: 5,
    }),
  ]);

  const totalRevenue = opportunities
    .filter((o) => o.stage === "cerrado_ganado")
    .reduce((acc, o) => acc + o.value, 0);

  const closedWon = opportunities.filter((o) => o.stage === "cerrado_ganado").length;
  const conversionRate = opportunities.length > 0
    ? ((closedWon / opportunities.length) * 100).toFixed(1)
    : "0";

  const pipelineValue = opportunities
    .filter((o) => !["cerrado_ganado", "cerrado_perdido"].includes(o.stage))
    .reduce((acc, o) => acc + o.value, 0);

  const performanceData = buildPerformanceData(recentLeads, recentOpps);

  const totalLeadsForOrigin = leadsByOriginRaw.reduce((s: number, r: any) => s + r._count._all, 0);
  const originData = (leadsByOriginRaw as any[]).map((r: any) => ({
    name: ORIGIN_LABELS[r.origin] || r.origin,
    value: totalLeadsForOrigin > 0 ? Math.round((r._count._all / totalLeadsForOrigin) * 100) : 0,
    raw: r._count._all,
    color: ORIGIN_COLORS[r.origin] || "var(--color-text-muted)",
  })).sort((a, b) => b.value - a.value);

  const teamData = teamStats.map((u) => ({
    name: u.name || "Sin nombre",
    role: u.role,
    leads: u.leadsAssigned.length,
    converted: u.leadsAssigned.filter((l) => l.status === "calificado").length,
    convRate: u.leadsAssigned.length > 0
      ? Math.round((u.leadsAssigned.filter((l) => l.status === "calificado").length / u.leadsAssigned.length) * 100)
      : 0,
  }));

  const hasCRM = totalLeads > 0 || opportunities.length > 0;

  const [metaTodayResult, metaMonthlyResult, metaYesterdayResult, metaAccounts] = await Promise.all([
    fetchMetaFull(companyId, "today"),
    fetchMetaFull(companyId, "last_30d"),
    fetchMetaFull(companyId, "yesterday"),
    getAllMetaAdAccounts(companyId),
  ]);

  const metaToday = metaTodayResult.data;
  const metaMonthly = metaMonthlyResult.data;
  const metaYesterday = metaYesterdayResult.data;
  const metaError = [metaTodayResult, metaMonthlyResult, metaYesterdayResult].some((r) => r.status === "error");
  const metaConfigured = metaTodayResult.status !== "no_credentials";

  return (
    <DashboardClient
      stats={{
        totalLeads,
        newLeads,
        opportunities: opportunities.length,
        totalRevenue,
        conversionRate,
        alerts,
        pipelineValue,
        closedWon,
      }}
      preferences={preferences}
      performanceData={performanceData}
      originData={originData}
      recentActivities={recentActivities}
      teamData={teamData}
      weeklySummary={weeklySummary ? {
        totalLeads: weeklySummary.totalLeads,
        totalRevenue: weeklySummary.totalRevenue,
        bestCampaign: weeklySummary.bestCampaign,
        aiRecommendation: weeklySummary.aiRecommendation,
        weekStart: weeklySummary.weekStart.toISOString(),
        weekEnd: weeklySummary.weekEnd.toISOString(),
      } : null}
      userName={session?.user?.name || "Usuario"}
      companyName={company?.name}
      metaToday={metaToday}
      metaMonthly={metaMonthly}
      metaYesterday={metaYesterday}
      metaError={metaError}
      metaConfigured={metaConfigured}
      metaAccounts={metaAccounts.map((a) => ({ accountId: a.accountId, label: a.label }))}
      dashboardConfigured={preferences.dashboardConfigured ?? false}
      hasCRM={hasCRM}
    />
  );
}
