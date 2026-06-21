import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMetaCredentials } from "@/lib/meta-credentials";

const META_API = "https://graph.facebook.com/v21.0";

const LEAD_ACTION_TYPES = [
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
];

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = (session.user as any).companyId as string | undefined;
  const { token, account: rawAccount } = await getMetaCredentials(companyId);
  const account = rawAccount?.startsWith("act_") ? rawAccount : rawAccount ? `act_${rawAccount}` : null;

  if (!token || !account) {
    return NextResponse.json({ error: "Meta credentials not configured" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaign_id");
  const datePreset = searchParams.get("date_preset") || "last_30d";

  if (!campaignId) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  try {
    const url =
      `${META_API}/${campaignId}/insights` +
      `?fields=actions,impressions,clicks,spend` +
      `&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone` +
      `&date_preset=${datePreset}` +
      `&access_token=${token}`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    // Build array of 24 hours, filling in zeros for missing entries
    const hourMap: Record<number, { leads: number; clicks: number; impressions: number; spend: number }> = {};
    for (let h = 0; h < 24; h++) {
      hourMap[h] = { leads: 0, clicks: 0, impressions: 0, spend: 0 };
    }

    for (const row of data.data || []) {
      const hourStr: string = row.hourly_stats_aggregated_by_advertiser_time_zone ?? "0";
      const hour = parseInt(hourStr, 10);
      if (isNaN(hour) || hour < 0 || hour > 23) continue;

      const leadAction = (row.actions as any[] | undefined)?.find((a: any) =>
        LEAD_ACTION_TYPES.includes(a.action_type)
      );

      hourMap[hour].leads      += parseInt(leadAction?.value || "0", 10);
      hourMap[hour].clicks     += parseInt(row.clicks     || "0", 10);
      hourMap[hour].impressions+= parseInt(row.impressions|| "0", 10);
      hourMap[hour].spend      += parseFloat(row.spend    || "0");
    }

    const hourly = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: `${String(h).padStart(2, "0")}:00`,
      ...hourMap[h],
    }));

    return NextResponse.json({ hourly });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
