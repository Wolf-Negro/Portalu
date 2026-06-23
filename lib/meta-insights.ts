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
    if (!entry) {
      const message = period === "today"
        ? "Meta Ads todavía no ha procesado los datos de hoy (suele tardar varias horas en reflejarse). No es que no haya campañas activas — el gasto de hoy aún no está disponible vía API. Sugiere consultar 'ayer' o revisar directamente el Administrador de Anuncios para el dato más actualizado de hoy."
        : "Sin datos para este período (puede que no haya campañas activas en ese rango).";
      return { period, message };
    }

    return { period, ...parseMetaInsightEntry(entry) };
  } catch (err) {
    console.error("[meta-insights] fetchAccountMetrics error:", err);
    return { error: "No se pudo obtener el dato de Meta Ads." };
  }
}

/** Métricas agregadas de toda la cuenta para un rango de fechas exacto (since/until, formato YYYY-MM-DD). */
export async function fetchAccountMetricsRange(
  companyId: string | undefined,
  since: string,
  until: string
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

    const params = new URLSearchParams({
      fields,
      time_range: JSON.stringify({ since, until }),
      access_token: token,
    });
    params.set("action_attribution_windows", '["7d_click","1d_view"]');
    params.set("use_unified_attribution_setting", "true");

    const res = await fetch(`${META_API}/${account}/insights?${params.toString()}`, { cache: "no-store" });
    if (!res.ok) return { error: "No se pudo conectar con la API de Meta Ads." };

    const json = await res.json();
    if (json.error) return { error: json.error.message ?? "Error de la API de Meta Ads." };

    const entry = json?.data?.[0];
    if (!entry) return { since, until, message: "Sin datos para este rango de fechas." };

    return { since, until, ...parseMetaInsightEntry(entry) };
  } catch (err) {
    console.error("[meta-insights] fetchAccountMetricsRange error:", err);
    return { error: "No se pudo obtener el dato de Meta Ads." };
  }
}

/** Lista de campañas con sus métricas individuales para un date_preset. */
export async function fetchCampaignsWithInsights(
  companyId: string | undefined,
  datePreset: string
): Promise<Record<string, unknown>> {
  try {
    const { token, account: rawAccount } = await getMetaCredentials(companyId);
    if (!token || !rawAccount) {
      return { error: "Meta Ads no está configurado para esta empresa." };
    }
    // getMetaCredentials devuelve el ID crudo (sin "act_") — Meta necesita el
    // prefijo en la URL del endpoint o resuelve mal el nodo (error #100).
    const account = rawAccount.startsWith("act_") ? rawAccount : `act_${rawAccount}`;

    const campRes = await fetch(
      `${META_API}/${account}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time&limit=20&access_token=${token}`
    );
    const campData = await campRes.json();
    if (campData.error) return { error: campData.error.message ?? "Error de la API de Meta Ads." };

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
