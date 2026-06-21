import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMetaCredentials } from "@/lib/meta-credentials";

export const dynamic = "force-dynamic";

// Mapeo de objetivos Meta → categoría legible
const OBJECTIVE_MAP: Record<
  string,
  { label: string; category: string; relevantMetrics: string[] }
> = {
  OUTCOME_LEADS: {
    label: "Generación de leads",
    category: "leads",
    relevantMetrics: [
      "leads",
      "cpl",
      "ctr",
      "cpc",
      "reach",
      "impressions",
      "landingPageViews",
      "linkClicks",
    ],
  },
  OUTCOME_SALES: {
    label: "Ventas",
    category: "sales",
    relevantMetrics: [
      "roas",
      "purchases",
      "purchaseValue",
      "cpc",
      "ctr",
      "reach",
      "spend",
      "cpl",
    ],
  },
  OUTCOME_TRAFFIC: {
    label: "Tráfico",
    category: "traffic",
    relevantMetrics: [
      "linkClicks",
      "landingPageViews",
      "outboundClicks",
      "ctr",
      "cpc",
      "reach",
      "impressions",
      "frequency",
    ],
  },
  OUTCOME_AWARENESS: {
    label: "Reconocimiento",
    category: "awareness",
    relevantMetrics: [
      "reach",
      "impressions",
      "frequency",
      "cpm",
      "spend",
      "videoViews",
      "postEngagement",
    ],
  },
  OUTCOME_ENGAGEMENT: {
    label: "Interacción",
    category: "engagement",
    relevantMetrics: [
      "postEngagement",
      "postReactions",
      "postComments",
      "postShares",
      "reach",
      "impressions",
      "ctr",
    ],
  },
  OUTCOME_APP_PROMOTION: {
    label: "Promoción de app",
    category: "app",
    relevantMetrics: ["clicks", "ctr", "cpc", "reach", "impressions", "spend"],
  },
  // Legacy objectives
  LEAD_GENERATION: {
    label: "Generación de leads",
    category: "leads",
    relevantMetrics: [
      "leads",
      "cpl",
      "ctr",
      "cpc",
      "reach",
      "impressions",
      "landingPageViews",
    ],
  },
  CONVERSIONS: {
    label: "Conversiones",
    category: "sales",
    relevantMetrics: [
      "purchases",
      "purchaseValue",
      "roas",
      "cpc",
      "ctr",
      "reach",
      "spend",
    ],
  },
  LINK_CLICKS: {
    label: "Clics en enlace",
    category: "traffic",
    relevantMetrics: [
      "linkClicks",
      "landingPageViews",
      "ctr",
      "cpc",
      "reach",
      "impressions",
    ],
  },
  REACH: {
    label: "Alcance",
    category: "awareness",
    relevantMetrics: ["reach", "impressions", "frequency", "cpm", "spend"],
  },
  BRAND_AWARENESS: {
    label: "Reconocimiento de marca",
    category: "awareness",
    relevantMetrics: [
      "reach",
      "impressions",
      "frequency",
      "cpm",
      "videoViews",
    ],
  },
  VIDEO_VIEWS: {
    label: "Visualizaciones de video",
    category: "awareness",
    relevantMetrics: [
      "videoViews",
      "videoP25",
      "videoP50",
      "videoP75",
      "videoP100",
      "reach",
      "impressions",
    ],
  },
  POST_ENGAGEMENT: {
    label: "Interacción",
    category: "engagement",
    relevantMetrics: [
      "postEngagement",
      "postReactions",
      "postComments",
      "postShares",
      "reach",
    ],
  },
};

export async function GET() {
  const session = await auth();
  const companyId = (session?.user as { companyId?: string } | undefined)
    ?.companyId;
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { token, account: rawAccount } =
      await getMetaCredentials(companyId);
    if (!token || !rawAccount) {
      return NextResponse.json({ campaigns: [] });
    }
    const account = rawAccount.startsWith("act_")
      ? rawAccount
      : `act_${rawAccount}`;

    // Fetch campaigns with insights
    const insightFields = [
      "spend", "impressions", "clicks", "reach", "frequency",
      "ctr", "cpc", "cpm", "actions", "action_values",
      "cost_per_action_type", "outbound_clicks",
    ].join(",");

    const fields = [
      "id", "name", "objective", "status", "effective_status",
      "daily_budget", "lifetime_budget",
      `insights.date_preset(last_30d){${insightFields}}`,
    ].join(",");

    const params = new URLSearchParams({
      fields,
      effective_status: '["ACTIVE","PAUSED"]',
      limit: "50",
      action_attribution_windows: '["7d_click","1d_view"]',
      use_unified_attribution_setting: "true",
      access_token: token,
    });

    const url = `https://graph.facebook.com/v21.0/${account}/campaigns?${params.toString()}`;

    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return NextResponse.json({ campaigns: [] });

    const json = await res.json();
    if (json.error) return NextResponse.json({ campaigns: [] });

    const campaigns = (json.data ?? []).map((c: Record<string, unknown>) => {
      const insight = (
        c.insights as
          | { data?: Record<string, unknown>[] }
          | undefined
      )?.data?.[0];

      const actions: { action_type: string; value: string }[] =
        (insight?.actions as { action_type: string; value: string }[] | undefined) ?? [];
      const actionValues: { action_type: string; value: string }[] =
        (insight?.action_values as { action_type: string; value: string }[] | undefined) ?? [];
      const costPerActionType: { action_type: string; value: string }[] =
        (insight?.cost_per_action_type as { action_type: string; value: string }[] | undefined) ?? [];

      const leads = actions
        .filter((a) =>
          [
            "lead",
            "onsite_conversion.lead_grouped",
            "offsite_conversion.fb_pixel_lead",
          ].includes(a.action_type)
        )
        .reduce((s, a) => s + parseFloat(a.value ?? "0"), 0);

      const spend = parseFloat((insight?.spend as string | undefined) ?? "0");

      const objectiveKey =
        typeof c.objective === "string" ? c.objective : "UNKNOWN";
      const objectiveInfo = OBJECTIVE_MAP[objectiveKey] ?? {
        label: objectiveKey !== "UNKNOWN" ? objectiveKey : "Desconocido",
        category: "general",
        relevantMetrics: [] as string[],
      };

      // ─── Primary result (objective-aware) ──────────────────────────────────

      type ResultInfo = { type: string; label: string; count: number; cost: number };
      let primaryResult: ResultInfo;

      const category = objectiveInfo.category;

      if (category === "leads") {
        const costPerLead = costPerActionType.find((x) =>
          ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"].includes(x.action_type)
        );
        primaryResult = {
          type: "lead",
          label: "Leads",
          count: leads,
          cost: costPerLead
            ? parseFloat(costPerLead.value)
            : leads > 0 ? spend / leads : 0,
        };
      } else if (category === "sales") {
        const purchases = actions
          .filter((a) =>
            ["purchase", "offsite_conversion.fb_pixel_purchase"].includes(a.action_type)
          )
          .reduce((s, a) => s + parseFloat(a.value ?? "0"), 0);
        const purchaseValue = actionValues
          .filter((a) => a.action_type === "purchase")
          .reduce((s, a) => s + parseFloat(a.value ?? "0"), 0);
        void purchaseValue; // available for ROAS if needed downstream
        const costPerPurchase = costPerActionType.find((x) => x.action_type === "purchase");
        primaryResult = {
          type: "purchase",
          label: "Compras",
          count: purchases,
          cost: costPerPurchase
            ? parseFloat(costPerPurchase.value)
            : purchases > 0 ? spend / purchases : 0,
        };
      } else if (category === "traffic") {
        const linkClicks = actions
          .filter((a) => a.action_type === "link_click")
          .reduce((s, a) => s + parseFloat(a.value ?? "0"), 0);
        const outboundClicks = parseInt(
          (insight?.outbound_clicks as { value: string }[] | undefined)?.[0]?.value ?? "0",
          10
        );
        const costPerLinkClick = costPerActionType.find((x) => x.action_type === "link_click");
        const clicks30d = Math.max(
          linkClicks,
          outboundClicks,
          parseInt((insight?.clicks as string | undefined) ?? "0", 10)
        );
        primaryResult = {
          type: "link_click",
          label: "Clics",
          count: clicks30d,
          cost: costPerLinkClick
            ? parseFloat(costPerLinkClick.value)
            : parseFloat((insight?.cpc as string | undefined) ?? "0"),
        };
      } else if (category === "awareness") {
        primaryResult = {
          type: "reach",
          label: "Alcance",
          count: parseInt((insight?.reach as string | undefined) ?? "0", 10),
          cost: parseFloat((insight?.cpm as string | undefined) ?? "0"),
        };
      } else if (category === "engagement") {
        const postEngagement = actions
          .filter((a) => a.action_type === "post_engagement")
          .reduce((s, a) => s + parseFloat(a.value ?? "0"), 0);
        const costPerEngagement = costPerActionType.find((x) => x.action_type === "post_engagement");
        primaryResult = {
          type: "post_engagement",
          label: "Interacciones",
          count: postEngagement,
          cost: costPerEngagement
            ? parseFloat(costPerEngagement.value)
            : postEngagement > 0 ? spend / postEngagement : 0,
        };
      } else {
        primaryResult = { type: "spend", label: "Gasto", count: spend, cost: 0 };
      }

      const hasExpectedResults = primaryResult.count > 0 || spend === 0;
      const hasMixedObjectives = !hasExpectedResults && spend > 0;

      return {
        id: c.id,
        name: c.name,
        objective: objectiveKey,
        objectiveLabel: objectiveInfo.label,
        category: objectiveInfo.category,
        relevantMetrics: objectiveInfo.relevantMetrics,
        status: c.status,
        effectiveStatus: c.effective_status,
        dailyBudget: c.daily_budget
          ? parseFloat(c.daily_budget as string) / 100
          : null,
        lifetimeBudget: c.lifetime_budget
          ? parseFloat(c.lifetime_budget as string) / 100
          : null,
        // 30-day aggregated
        spend30d: spend,
        leads30d: leads,
        impressions30d: parseInt(
          (insight?.impressions as string | undefined) ?? "0",
          10
        ),
        clicks30d: parseInt(
          (insight?.clicks as string | undefined) ?? "0",
          10
        ),
        ctr30d: parseFloat((insight?.ctr as string | undefined) ?? "0"),
        cpc30d: parseFloat((insight?.cpc as string | undefined) ?? "0"),
        cpm30d: parseFloat((insight?.cpm as string | undefined) ?? "0"),
        reach30d: parseInt((insight?.reach as string | undefined) ?? "0", 10),
        // Primary result (objective-aware)
        primaryResult,
        hasMixedObjectives,
      };
    });

    return NextResponse.json({ campaigns });
  } catch {
    return NextResponse.json({ campaigns: [] });
  }
}
