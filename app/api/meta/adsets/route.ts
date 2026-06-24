import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMetaCredentials } from "@/lib/meta-credentials";

const META_API = "https://graph.facebook.com/v21.0";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if ((session.user as any).role === "asesor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companyId = (session.user as any).companyId as string | undefined;
  const { searchParams } = new URL(req.url);
  const accountId = searchParams.get("account_id") || undefined;
  const { token: TOKEN } = await getMetaCredentials(companyId, accountId);

  const campaignId = searchParams.get("campaign_id");
  const datePreset = searchParams.get("date_preset") || "last_30d";

  if (!campaignId) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  try {
    const res = await fetch(
      `${META_API}/${campaignId}/adsets?fields=id,name,status,daily_budget,targeting&access_token=${TOKEN}`
    );
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    const adsets = data.data || [];

    // Fetch insights per adset
    const withInsights = await Promise.all(
      adsets.map(async (a: any) => {
        const insRes = await fetch(
          `${META_API}/${a.id}/insights?fields=spend,reach,impressions,clicks,actions,ctr,cpm&date_preset=${datePreset}&access_token=${TOKEN}`
        );
        const ins = await insRes.json();
        const insData = ins.data?.[0] || {};
        const leadActions = insData.actions?.find((ac: any) =>
          ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"].includes(ac.action_type)
        );
        const landingViews = insData.actions?.find((ac: any) => ac.action_type === "landing_page_view");

        return {
          id: a.id,
          name: a.name,
          status: a.status === "ACTIVE" ? "active" : "paused",
          dailyBudget: parseFloat(a.daily_budget || "0") / 100,
          spend: parseFloat(insData.spend || "0"),
          reach: parseInt(insData.reach || "0"),
          impressions: parseInt(insData.impressions || "0"),
          clicks: parseInt(insData.clicks || "0"),
          landingViews: parseInt(landingViews?.value || "0"),
          leads: parseInt(leadActions?.value || "0"),
          ctr: Math.round(parseFloat(insData.ctr || "0") * 100) / 100,
          targeting: a.targeting,
        };
      })
    );

    return NextResponse.json({ adsets: withInsights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
