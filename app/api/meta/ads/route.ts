import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMetaCredentials } from "@/lib/meta-credentials";

const META_API = "https://graph.facebook.com/v21.0";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId as string | undefined;
  const { token: TOKEN } = await getMetaCredentials(companyId);

  const { searchParams } = new URL(req.url);
  const adsetId = searchParams.get("adset_id");
  const datePreset = searchParams.get("date_preset") || "last_30d";

  if (!adsetId) return NextResponse.json({ error: "adset_id required" }, { status: 400 });

  try {
    const res = await fetch(
      `${META_API}/${adsetId}/ads?fields=id,name,status,creative{id,name,thumbnail_url,body,title}&limit=20&access_token=${TOKEN}`
    );
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    const ads = data.data || [];

    const withInsights = await Promise.all(
      ads.map(async (ad: any) => {
        const insRes = await fetch(
          `${META_API}/${ad.id}/insights?fields=spend,reach,impressions,clicks,actions,ctr,cpm&date_preset=${datePreset}&access_token=${TOKEN}`
        );
        const ins = await insRes.json();
        const insData = ins.data?.[0] || {};
        const leadActions = insData.actions?.find((ac: any) =>
          ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"].includes(ac.action_type)
        );
        const linkClicks = insData.actions?.find((ac: any) => ac.action_type === "link_click");
        const videoViews = insData.actions?.find((ac: any) => ac.action_type === "video_view");
        const landingViews = insData.actions?.find((ac: any) => ac.action_type === "landing_page_view");

        return {
          id: ad.id,
          name: ad.name,
          status: ad.status === "ACTIVE" ? "active" : "paused",
          creative: {
            thumbnailUrl: ad.creative?.thumbnail_url || null,
            body: ad.creative?.body || null,
            title: ad.creative?.title || null,
          },
          spend: parseFloat(insData.spend || "0"),
          reach: parseInt(insData.reach || "0"),
          impressions: parseInt(insData.impressions || "0"),
          clicks: parseInt(insData.clicks || "0"),
          linkClicks: parseInt(linkClicks?.value || "0"),
          landingViews: parseInt(landingViews?.value || "0"),
          videoViews: parseInt(videoViews?.value || "0"),
          leads: parseInt(leadActions?.value || "0"),
          ctr: Math.round(parseFloat(insData.ctr || "0") * 100) / 100,
          cpm: Math.round(parseFloat(insData.cpm || "0") * 100) / 100,
        };
      })
    );

    return NextResponse.json({ ads: withInsights });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
