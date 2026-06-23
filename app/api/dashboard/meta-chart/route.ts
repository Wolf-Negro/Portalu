import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMetaCredentials } from "@/lib/meta-credentials";

export const dynamic = "force-dynamic";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "today" | "last_7d" | "last_30d";
type Breakdown = "day" | "campaign" | "adset" | "account";

interface MetaAction {
  action_type: string;
  value: string;
}

interface MetaInsightEntry {
  date_start?: string;
  campaign_name?: string;
  adset_name?: string;
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

// Subset of MetaData keys that can be requested
type MetricKey =
  | "spend"
  | "reach"
  | "impressions"
  | "clicks"
  | "linkClicks"
  | "outboundClicks"
  | "landingPageViews"
  | "leads"
  | "purchases"
  | "purchaseValue"
  | "ctr"
  | "cpc"
  | "cpm"
  | "frequency"
  | "videoViews"
  | "postEngagement"
  | "postReactions"
  | "postComments"
  | "postShares"
  | "cpl"
  | "roas"
  | "costPerLandingPageView";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function parseInsightEntry(entry: MetaInsightEntry): Record<MetricKey, number> {
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

  const outboundClicks = parseFloat(
    entry.outbound_clicks?.[0]?.value ?? "0"
  );

  const spend = parseFloat(entry.spend ?? "0");
  const cpl = leads > 0 ? spend / leads : 0;
  const roas = spend > 0 ? purchaseValue / spend : 0;
  const costPerLandingPageView =
    landingPageViews > 0 ? spend / landingPageViews : 0;

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

function formatDateLabel(dateStr: string): string {
  // dateStr from Meta is "YYYY-MM-DD"
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  const companyId = (session?.user as { companyId?: string } | undefined)
    ?.companyId;

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const metricsParam = searchParams.get("metrics") ?? "spend,leads";
  const period = (searchParams.get("period") ?? "last_30d") as Period;
  const breakdown = (searchParams.get("breakdown") ?? "day") as Breakdown;
  const campaignId = searchParams.get("campaign_id") ?? null;

  const requestedMetrics = metricsParam
    .split(",")
    .map((m) => m.trim()) as MetricKey[];

  const validPeriods: Period[] = ["today", "last_7d", "last_30d"];
  const validBreakdowns: Breakdown[] = ["day", "campaign", "adset", "account"];
  if (!validPeriods.includes(period) || !validBreakdowns.includes(breakdown)) {
    return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
  }

  try {
    const { token, account: rawAccount } = await getMetaCredentials(companyId);
    if (!token || !rawAccount) {
      return NextResponse.json(
        { error: "Meta credentials not configured" },
        { status: 422 }
      );
    }
    const account = rawAccount.startsWith("act_")
      ? rawAccount
      : `act_${rawAccount}`;

    // Build fields list
    const baseFields = [
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
    ];

    if (breakdown === "campaign") {
      baseFields.push("campaign_name");
    } else if (breakdown === "adset") {
      baseFields.push("adset_name");
    }

    const fieldsStr = baseFields.join(",");

    const params = new URLSearchParams({
      fields: fieldsStr,
      date_preset: period,
      access_token: token,
    });

    params.set("action_attribution_windows", '["7d_click","1d_view"]');
    params.set("use_unified_attribution_setting", "true");

    if (breakdown === "day") {
      params.set("time_increment", "1");
    } else if (breakdown === "campaign") {
      params.set("level", "campaign");
    } else if (breakdown === "adset") {
      params.set("level", "adset");
    }
    // breakdown === "account" → no time_increment, no level (account-level aggregate)

    // Use campaign endpoint if campaign_id provided, else account-level
    const baseEndpoint = campaignId
      ? `https://graph.facebook.com/v21.0/${campaignId}/insights`
      : `https://graph.facebook.com/v21.0/${account}/insights`;

    const url = `${baseEndpoint}?${params.toString()}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Meta API request failed" },
        { status: 502 }
      );
    }

    const json = await res.json();
    if (json.error) {
      return NextResponse.json(
        { error: json.error.message ?? "Meta API error" },
        { status: 502 }
      );
    }

    const rawData: MetaInsightEntry[] = json?.data ?? [];

    const chartData = rawData.map((entry) => {
      const parsed = parseInsightEntry(entry);

      // Determine label
      let label: string;
      if (breakdown === "day") {
        label = entry.date_start ? formatDateLabel(entry.date_start) : "";
      } else if (breakdown === "campaign") {
        label = entry.campaign_name ?? "Sin nombre";
      } else if (breakdown === "adset") {
        label = entry.adset_name ?? "Sin nombre";
      } else {
        // breakdown === "account" → single aggregate row
        label = "Total";
      }

      // Pick only requested metrics
      const point: Record<string, string | number> = { label };
      for (const metric of requestedMetrics) {
        point[metric] = parsed[metric] ?? 0;
      }

      return point;
    });

    return NextResponse.json({
      data: chartData,
      breakdown,
      period,
      campaignId,
    });
  } catch (err) {
    console.error("[meta-chart] error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
