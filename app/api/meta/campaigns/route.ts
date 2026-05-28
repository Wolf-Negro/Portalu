import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMetaCredentials } from "@/lib/meta-credentials";

const META_API = "https://graph.facebook.com/v21.0";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId as string | undefined;
  const { token: TOKEN, account: ACCOUNT } = await getMetaCredentials(companyId);

  if (!TOKEN || TOKEN.startsWith("EAA...")) {
    return NextResponse.json({ error: "META_ACCESS_TOKEN not configured" }, { status: 503 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const datePreset = searchParams.get("date_preset") || "last_30d";

    // 1. Fetch campaigns
    const campRes = await fetch(
      `${META_API}/${ACCOUNT}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time&limit=20&access_token=${TOKEN}`
    );
    const campData = await campRes.json();
    if (campData.error) return NextResponse.json({ error: campData.error.message }, { status: 400 });

    const campaigns = campData.data || [];

    // 2. Fetch insights for each campaign in parallel
    const insightsResults = await Promise.all(
      campaigns.map(async (c: any) => {
        const insRes = await fetch(
          `${META_API}/${c.id}/insights?fields=spend,reach,impressions,clicks,actions,cost_per_action_type,ctr,cpm,cpp,frequency&date_preset=${datePreset}&access_token=${TOKEN}`
        );
        const insData = await insRes.json();
        return { campaignId: c.id, insights: insData.data?.[0] || null };
      })
    );

    // 3. Merge campaigns with insights
    const result = campaigns.map((c: any) => {
      const ins = insightsResults.find((r) => r.campaignId === c.id)?.insights;
      const leadActions = ins?.actions?.find((a: any) =>
        ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"].includes(a.action_type)
      );
      const landingViews = ins?.actions?.find((a: any) => a.action_type === "landing_page_view");
      const linkClicks = ins?.actions?.find((a: any) => a.action_type === "link_click");
      const videoViews = ins?.actions?.find((a: any) => a.action_type === "video_view");

      const spend = parseFloat(ins?.spend || "0");
      const leads = parseInt(leadActions?.value || "0");
      const cpl = leads > 0 ? spend / leads : 0;
      const ctr = parseFloat(ins?.ctr || "0");

      return {
        id: c.id,
        name: c.name,
        status: c.status === "ACTIVE" ? "active" : "paused",
        objective: c.objective,
        budget: parseFloat(c.daily_budget || c.lifetime_budget || "0") / 100,
        spent: spend,
        reach: parseInt(ins?.reach || "0"),
        impressions: parseInt(ins?.impressions || "0"),
        clicks: parseInt(ins?.clicks || "0"),
        linkClicks: parseInt(linkClicks?.value || "0"),
        landingViews: parseInt(landingViews?.value || "0"),
        videoViews: parseInt(videoViews?.value || "0"),
        leads,
        cpl: Math.round(cpl * 100) / 100,
        ctr: Math.round(ctr * 100) / 100,
        cpm: Math.round(parseFloat(ins?.cpm || "0") * 100) / 100,
        roas: 0,
        frequency: Math.round(parseFloat(ins?.frequency || "0") * 100) / 100,
        startDate: c.start_time,
        hasFatigue: ctr > 0 && ctr < 1.5,
      };
    });

    return NextResponse.json({ campaigns: result, account: { id: ACCOUNT } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
