import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMetaCredentials, getAllMetaAdAccounts } from "@/lib/meta-credentials";
import CampanasClient from "./CampanasClient";

export const dynamic = "force-dynamic";

async function fetchOneAccountCampaigns(token: string, rawAccount: string): Promise<any[]> {
  // Meta API requires act_ prefix on ad account IDs
  const account = rawAccount.startsWith("act_") ? rawAccount : `act_${rawAccount}`;

  const campRes = await fetch(
    `https://graph.facebook.com/v21.0/${account}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time&limit=20&access_token=${token}`,
    { cache: "no-store" }
  );
  const campData = await campRes.json();
  if (campData.error) return [];

  const campaigns: any[] = campData.data || [];

  const insightsResults = await Promise.allSettled(
    campaigns.map(async (c) => {
      const insRes = await fetch(
        `https://graph.facebook.com/v21.0/${c.id}/insights?fields=spend,reach,impressions,clicks,actions,ctr,cpm,cpp,frequency&date_preset=last_30d&access_token=${token}`,
        { cache: "no-store" }
      );
      const insData = await insRes.json();
      return { campaignId: c.id, insights: insData.data?.[0] || null };
    })
  );
  const resolved = insightsResults.map((r, i) =>
    r.status === "fulfilled" ? r.value : { campaignId: campaigns[i].id, insights: null }
  );

  return campaigns.map((c) => {
    const ins = resolved.find((r) => r.campaignId === c.id)?.insights;
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
      frequency: Math.round(parseFloat(ins?.frequency || "0") * 100) / 100,
      roas: 0,
      startDate: c.start_time,
      hasFatigue: ctr > 0 && ctr < 1.5,
    };
  });
}

/** Sin accountId, combina las campañas de todas las cuentas publicitarias de la empresa. */
async function fetchMetaCampaigns(
  companyId: string | undefined,
  accountId?: string
): Promise<{ campaigns: any[]; error?: string }> {
  try {
    if (accountId) {
      const { token, account } = await getMetaCredentials(companyId, accountId);
      if (!token || !account) return { campaigns: [], error: "Configura META_ACCESS_TOKEN y META_AD_ACCOUNT_ID" };
      return { campaigns: await fetchOneAccountCampaigns(token, account) };
    }

    const accounts = await getAllMetaAdAccounts(companyId);
    if (accounts.length === 0) return { campaigns: [], error: "Configura META_ACCESS_TOKEN y META_AD_ACCOUNT_ID" };

    const results = await Promise.allSettled(
      accounts.map((a) => fetchOneAccountCampaigns(a.accessToken, a.accountId))
    );
    const campaigns = results
      .filter((r): r is PromiseFulfilledResult<any[]> => r.status === "fulfilled")
      .flatMap((r) => r.value);

    return { campaigns };
  } catch (err: any) {
    return { campaigns: [], error: err.message };
  }
}

export default async function CampanasPage() {
  const session = await auth();
  if ((session?.user as any)?.role === "asesor") redirect("/dashboard");
  const companyId = (session?.user as any)?.companyId as string | undefined;
  const [{ campaigns, error }, metaAccounts] = await Promise.all([
    fetchMetaCampaigns(companyId),
    getAllMetaAdAccounts(companyId),
  ]);
  return (
    <CampanasClient
      campaigns={campaigns}
      metaError={error}
      metaAccounts={metaAccounts.map((a) => ({ accountId: a.accountId, label: a.label }))}
    />
  );
}
