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
  const since = searchParams.get("since");
  const until = searchParams.get("until");

  if (!campaignId) return NextResponse.json({ error: "campaign_id required" }, { status: 400 });

  const dateParams = since && until
    ? `&time_range[since]=${since}&time_range[until]=${until}`
    : "&date_preset=last_30d";

  try {
    const res = await fetch(
      `${META_API}/${campaignId}/insights?fields=spend,reach,impressions,clicks,actions,ctr&time_increment=1${dateParams}&access_token=${TOKEN}`
    );
    const data = await res.json();
    if (data.error) return NextResponse.json({ error: data.error.message }, { status: 400 });

    const daily = (data.data || []).map((d: any) => {
      const leadActions = d.actions?.find((a: any) =>
        ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"].includes(a.action_type)
      );
      return {
        date: d.date_start,
        spend: parseFloat(d.spend || "0"),
        reach: parseInt(d.reach || "0"),
        impressions: parseInt(d.impressions || "0"),
        clicks: parseInt(d.clicks || "0"),
        leads: parseInt(leadActions?.value || "0"),
        ctr: Math.round(parseFloat(d.ctr || "0") * 100) / 100,
      };
    });

    return NextResponse.json({ daily });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
