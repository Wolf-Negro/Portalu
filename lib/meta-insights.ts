import { getMetaCredentials, getAllMetaAdAccounts } from "./meta-credentials";

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

type ParsedMetrics = ReturnType<typeof parseMetaInsightEntry>;

function sumActions(actions: MetaAction[], types: string[]): number {
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((acc, a) => acc + parseFloat(a.value ?? "0"), 0);
}

// Meta reporta el MISMO evento de conversión bajo varias action_type a la
// vez (ej. un lead vía pixel aparece como "lead", "offsite_conversion.fb_pixel_lead"
// y "onsite_web_lead" simultáneamente, todos con el mismo valor) — sumarlos
// duplica el conteo. Se toma el máximo entre los tipos candidatos, no la suma.
function maxAction(actions: MetaAction[], types: string[]): number {
  return actions
    .filter((a) => types.includes(a.action_type))
    .reduce((max, a) => Math.max(max, parseFloat(a.value ?? "0")), 0);
}

/** Misma lógica de parseo que app/api/dashboard/meta-chart/route.ts. */
function parseMetaInsightEntry(entry: MetaInsightEntry) {
  const actions: MetaAction[] = entry.actions ?? [];
  const actionValues: MetaAction[] = entry.action_values ?? [];

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

  const outboundClicks = parseFloat(entry.outbound_clicks?.[0]?.value ?? "0");

  const spend = parseFloat(entry.spend ?? "0");
  const impressions = parseInt(entry.impressions ?? "0", 10);
  const clicks = parseInt(entry.clicks ?? "0", 10);
  const cpl = leads > 0 ? spend / leads : 0;
  const roas = spend > 0 ? purchaseValue / spend : 0;
  const costPerLandingPageView = landingPageViews > 0 ? spend / landingPageViews : 0;

  return {
    spend,
    reach: parseInt(entry.reach ?? "0", 10),
    impressions,
    clicks,
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
    messages,
    cpl,
    roas,
    costPerLandingPageView,
  };
}

// Suma las métricas de varias cuentas publicitarias (modo "combinado") y
// recalcula las tasas (ctr, cpc, cpm, cpl, roas) a partir de los totales en
// vez de promediarlas — promediar tasas de cuentas con gasto muy distinto
// da un número que no representa nada real.
function aggregateMetrics(list: ParsedMetrics[]): ParsedMetrics {
  const sum = (key: keyof ParsedMetrics) => list.reduce((acc, m) => acc + (m[key] as number), 0);

  const spend = sum("spend");
  const clicks = sum("clicks");
  const impressions = sum("impressions");
  const leads = sum("leads");
  const purchases = sum("purchases");
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
    purchases,
    purchaseValue,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    frequency: list.length > 0 ? list.reduce((acc, m) => acc + m.frequency, 0) / list.length : 0,
    videoViews: sum("videoViews"),
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

function toAdAccount(rawAccount: string): string {
  return rawAccount.startsWith("act_") ? rawAccount : `act_${rawAccount}`;
}

async function fetchOneAccountMetrics(
  token: string,
  rawAccount: string,
  dateParam: Record<string, string>
): Promise<ParsedMetrics | null> {
  const account = toAdAccount(rawAccount);
  const fields = [
    "spend", "reach", "impressions", "clicks", "ctr", "cpc", "cpm", "frequency",
    "actions", "action_values", "outbound_clicks",
  ].join(",");

  const params = new URLSearchParams({ fields, access_token: token, ...dateParam });
  params.set("action_attribution_windows", '["7d_click","1d_view"]');
  params.set("use_unified_attribution_setting", "true");

  const res = await fetch(`${META_API}/${account}/insights?${params.toString()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const json = await res.json();
  if (json.error) return null;
  const entry = json?.data?.[0];
  if (!entry) return null;
  return parseMetaInsightEntry(entry);
}

/**
 * Métricas agregadas de Meta Ads para un período. Sin `accountId`, combina
 * TODAS las cuentas publicitarias de la empresa (modo "combinado"); con
 * `accountId`, devuelve solo esa cuenta específica.
 */
export async function fetchAccountMetrics(
  companyId: string | undefined,
  period: MetaPeriod,
  accountId?: string
): Promise<Record<string, unknown>> {
  try {
    const dateParam = { date_preset: period };

    if (accountId) {
      const { token, account } = await getMetaCredentials(companyId, accountId);
      if (!token || !account) return { error: "Meta Ads no está configurado para esta empresa." };
      const metrics = await fetchOneAccountMetrics(token, account, dateParam);
      if (!metrics) return { period, message: emptyMessage(period) };
      return { period, ...metrics };
    }

    const accounts = await getAllMetaAdAccounts(companyId);
    if (accounts.length === 0) return { error: "Meta Ads no está configurado para esta empresa." };

    const results = await Promise.allSettled(
      accounts.map((a) => fetchOneAccountMetrics(a.accessToken, a.accountId, dateParam))
    );
    const metrics = results
      .filter((r): r is PromiseFulfilledResult<ParsedMetrics | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((m): m is ParsedMetrics => m !== null);

    if (metrics.length === 0) return { period, message: emptyMessage(period) };
    return { period, ...aggregateMetrics(metrics) };
  } catch (err) {
    console.error("[meta-insights] fetchAccountMetrics error:", err);
    return { error: "No se pudo obtener el dato de Meta Ads." };
  }
}

function emptyMessage(period: MetaPeriod): string {
  return period === "today"
    ? "Meta Ads todavía no ha procesado los datos de hoy (suele tardar varias horas en reflejarse). No es que no haya campañas activas — el gasto de hoy aún no está disponible vía API. Sugiere consultar 'ayer' o revisar directamente el Administrador de Anuncios para el dato más actualizado de hoy."
    : "Sin datos para este período (puede que no haya campañas activas en ese rango).";
}

/** Métricas agregadas para un rango de fechas exacto (since/until, formato YYYY-MM-DD). */
export async function fetchAccountMetricsRange(
  companyId: string | undefined,
  since: string,
  until: string,
  accountId?: string
): Promise<Record<string, unknown>> {
  try {
    const dateParam = { time_range: JSON.stringify({ since, until }) };

    if (accountId) {
      const { token, account } = await getMetaCredentials(companyId, accountId);
      if (!token || !account) return { error: "Meta Ads no está configurado para esta empresa." };
      const metrics = await fetchOneAccountMetrics(token, account, dateParam);
      if (!metrics) return { since, until, message: "Sin datos para este rango de fechas." };
      return { since, until, ...metrics };
    }

    const accounts = await getAllMetaAdAccounts(companyId);
    if (accounts.length === 0) return { error: "Meta Ads no está configurado para esta empresa." };

    const results = await Promise.allSettled(
      accounts.map((a) => fetchOneAccountMetrics(a.accessToken, a.accountId, dateParam))
    );
    const metrics = results
      .filter((r): r is PromiseFulfilledResult<ParsedMetrics | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((m): m is ParsedMetrics => m !== null);

    if (metrics.length === 0) return { since, until, message: "Sin datos para este rango de fechas." };
    return { since, until, ...aggregateMetrics(metrics) };
  } catch (err) {
    console.error("[meta-insights] fetchAccountMetricsRange error:", err);
    return { error: "No se pudo obtener el dato de Meta Ads." };
  }
}

async function fetchOneAccountCampaigns(
  token: string,
  rawAccount: string,
  datePreset: string,
  accountLabel: string
): Promise<any[]> {
  const account = toAdAccount(rawAccount);
  const campRes = await fetch(
    `${META_API}/${account}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time&limit=20&access_token=${token}`
  );
  const campData = await campRes.json();
  if (campData.error) return [];

  const campaigns = campData.data || [];

  // allSettled (no all): con cuentas de muchas campañas se hacen N peticiones
  // en paralelo a Meta — si UNA falla (timeout, hiccup de red), Promise.all
  // rechaza TODO el reporte aunque las demás sí respondieran. Una campaña que
  // falla se trata como "sin datos" en vez de tumbar el reporte completo.
  const settled = await Promise.allSettled(
    campaigns.map(async (c: any) => {
      const insRes = await fetch(
        `${META_API}/${c.id}/insights?fields=spend,reach,impressions,clicks,actions,ctr,cpm,frequency&date_preset=${datePreset}&access_token=${token}`
      );
      const insData = await insRes.json();
      return { campaignId: c.id, insights: insData.data?.[0] || null };
    })
  );
  const insightsResults = settled.map((r, i) =>
    r.status === "fulfilled" ? r.value : { campaignId: campaigns[i].id, insights: null }
  );

  return campaigns.map((c: any) => {
    const ins = insightsResults.find((r) => r.campaignId === c.id)?.insights;
    const parsed = parseMetaInsightEntry(ins ?? {});
    return {
      id: c.id,
      name: c.name,
      status: c.status === "ACTIVE" ? "activa" : "pausada",
      objective: c.objective,
      budget: parseFloat(c.daily_budget || c.lifetime_budget || "0") / 100,
      accountLabel,
      ...parsed,
    };
  });
}

/**
 * Lista de campañas con sus métricas para un date_preset. Sin `accountId`,
 * combina las campañas de TODAS las cuentas publicitarias de la empresa
 * (cada campaña ya tiene un id único de Meta, así que no hay colisiones).
 */
export async function fetchCampaignsWithInsights(
  companyId: string | undefined,
  datePreset: string,
  accountId?: string
): Promise<Record<string, unknown>> {
  try {
    if (accountId) {
      const { token, account } = await getMetaCredentials(companyId, accountId);
      if (!token || !account) return { error: "Meta Ads no está configurado para esta empresa." };
      const campaigns = await fetchOneAccountCampaigns(token, account, datePreset, "Principal");
      return { period: datePreset, campaigns };
    }

    const accounts = await getAllMetaAdAccounts(companyId);
    if (accounts.length === 0) return { error: "Meta Ads no está configurado para esta empresa." };

    const results = await Promise.allSettled(
      accounts.map((a) => fetchOneAccountCampaigns(a.accessToken, a.accountId, datePreset, a.label))
    );
    const campaigns = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    return { period: datePreset, campaigns };
  } catch (err) {
    console.error("[meta-insights] fetchCampaignsWithInsights error:", err);
    return { error: "No se pudo obtener la lista de campañas de Meta Ads." };
  }
}
