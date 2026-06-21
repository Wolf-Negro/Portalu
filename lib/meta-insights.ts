import { getMetaCredentials } from "./meta-credentials";

const META_API = "https://graph.facebook.com/v21.0";

export type MetaPeriod = "today" | "yesterday" | "last_7d" | "last_30d";

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaInsightEntry {
  spend?: string;
  reach?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: MetaAction[];
  action_values?: MetaAction[];
  outbound_clicks?: { value: string }[];
}

function sumActions(actions: MetaAction[], types: string[]): number {
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((acc, a) => acc + parseFloat(a.value ?? "0"), 0);
}

/** Misma lógica de parseo que app/api/dashboard/meta-chart/route.ts. */
function parseMetaInsightEntry(entry: MetaInsightEntry) {
  const actions: MetaAction[] = entry.actions ?? [];
  const actionValues: MetaAction[] = entry.action_values ?? [];

  const leads = sumActions(actions, [
    "lead",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
  ]);
  const purchases = sumActions(actions, [
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

  const outboundClicks = parseFloat(entry.outbound_clicks?.[0]?.value ?? "0");

  const spend = parseFloat(entry.spend ?? "0");
  const cpl = leads > 0 ? spend / leads : 0;
  const roas = spend > 0 ? purchaseValue / spend : 0;
  const costPerLandingPageView = landingPageViews > 0 ? spend / landingPageViews : 0;

  return {
    spend,
    reach: parseInt(entry.reach ?? "0", 10),
    impressions: parseInt(entry.impressions ?? "0", 10),
    clicks: parseInt(entry.clicks ?? "0", 10),
    linkClicks,
    outboundClicks,
    landingPageViews,
    leads,
    purchases,
    purchaseValue,
    ctr: parseFloat(entry.ctr ?? "0"),
    cpc: parseFloat(entry.cpc ?? "0"),
    cpm: parseFloat(entry.cpm ?? "0"),
    frequency: parseFloat(entry.frequency ?? "0"),
    videoViews,
    postEngagement,
    postReactions,
    postComments,
    postShares,
    cpl,
    roas,
    costPerLandingPageView,
  };
}

/** Métricas agregadas de toda la cuenta de Meta Ads para un período. */
export async function fetchAccountMetrics(
  companyId: string | undefined,
  period: MetaPeriod
): Promise<Record<string, unknown>> {
  try {
    const { token, account: rawAccount } = await getMetaCredentials(companyId);
    if (!token || !rawAccount) {
      return { error: "Meta Ads no está configurado para esta empresa." };
    }
    const account = rawAccount.startsWith("act_") ? rawAccount : `act_${rawAccount}`;

    const fields = [
      "spend", "reach", "impressions", "clicks", "ctr", "cpc", "cpm", "frequency",
      "actions", "action_values", "outbound_clicks",
    ].join(",");

    const params = new URLSearchParams({ fields, date_preset: period, access_token: token });
    params.set("action_attribution_windows", '["7d_click","1d_view"]');
    params.set("use_unified_attribution_setting", "true");

    const res = await fetch(`${META_API}/${account}/insights?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return { error: "No se pudo conectar con la API de Meta Ads." };

    const json = await res.json();
    if (json.error) return { error: json.error.message ?? "Error de la API de Meta Ads." };

    const entry = json?.data?.[0];
    if (!entry) return { period, message: "Sin datos para este período (puede que no haya campañas activas)." };

    return { period, ...parseMetaInsightEntry(entry) };
  } catch (err) {
    console.error("[meta-insights] fetchAccountMetrics error:", err);
    return { error: "No se pudo obtener el dato de Meta Ads." };
  }
}

/** Lista de campañas con sus métricas individuales para un date_preset. */
export async function fetchCampaignsWithInsights(
  companyId: string | undefined,
  datePreset: string
): Promise<Record<string, unknown>> {
  try {
    const { token, account } = await getMetaCredentials(companyId);
    if (!token || !account) {
      return { error: "Meta Ads no está configurado para esta empresa." };
    }

    const campRes = await fetch(
      `${META_API}/${account}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time&limit=20&access_token=${token}`
    );
    const campData = await campRes.json();
    if (campData.error) return { error: campData.error.message ?? "Error de la API de Meta Ads." };

    const campaigns = campData.data || [];

    const insightsResults = await Promise.all(
      campaigns.map(async (c: any) => {
        const insRes = await fetch(
          `${META_API}/${c.id}/insights?fields=spend,reach,impressions,clicks,actions,ctr,cpm,frequency&date_preset=${datePreset}&access_token=${token}`
        );
        const insData = await insRes.json();
        return { campaignId: c.id, insights: insData.data?.[0] || null };
      })
    );

    const result = campaigns.map((c: any) => {
      const ins = insightsResults.find((r) => r.campaignId === c.id)?.insights;
      const parsed = parseMetaInsightEntry(ins ?? {});
      return {
        id: c.id,
        name: c.name,
        status: c.status === "ACTIVE" ? "activa" : "pausada",
        objective: c.objective,
        budget: parseFloat(c.daily_budget || c.lifetime_budget || "0") / 100,
        ...parsed,
      };
    });

    return { period: datePreset, campaigns: result };
  } catch (err) {
    console.error("[meta-insights] fetchCampaignsWithInsights error:", err);
    return { error: "No se pudo obtener la lista de campañas de Meta Ads." };
  }
}
