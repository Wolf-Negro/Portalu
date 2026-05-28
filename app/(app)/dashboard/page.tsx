import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

interface MetaToday {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
}

async function fetchMetaToday(): Promise<MetaToday | null> {
  try {
    const token = process.env.META_ACCESS_TOKEN;
    const account = process.env.META_AD_ACCOUNT_ID;
    if (!token || !account || token.startsWith("EAA...") || account.startsWith("act_...")) {
      return null;
    }

    const url =
      `https://graph.facebook.com/v21.0/${account}/insights` +
      `?fields=spend,reach,impressions,clicks,actions,ctr` +
      `&date_preset=today` +
      `&access_token=${token}`;

    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;

    const json = await res.json();
    const data = json?.data?.[0];
    if (!data) return null;

    const leadAction = (data.actions as any[] | undefined)?.find(
      (a: any) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped"
    );

    return {
      spend: parseFloat(data.spend ?? "0"),
      reach: parseInt(data.reach ?? "0", 10),
      impressions: parseInt(data.impressions ?? "0", 10),
      clicks: parseInt(data.clicks ?? "0", 10),
      leads: leadAction ? parseInt(leadAction.value, 10) : 0,
      ctr: parseFloat(data.ctr ?? "0"),
    };
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [totalLeads, newLeads, opportunities, campaigns] = await Promise.all([
    prisma.lead.count({ where: { companyId } }),
    prisma.lead.count({ where: { companyId, status: "nuevo" } }),
    prisma.opportunity.findMany({ where: { companyId } }),
    prisma.campaign.findMany({ where: { companyId }, take: 5, orderBy: { createdAt: "desc" } }),
  ]);

  const totalRevenue = opportunities
    .filter((o) => o.stage === "cerrado_ganado")
    .reduce((acc, o) => acc + o.value, 0);

  const conversionRate =
    opportunities.length > 0
      ? ((opportunities.filter((o) => o.stage === "cerrado_ganado").length / opportunities.length) * 100).toFixed(1)
      : "0";

  const recentActivities = await prisma.activity.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { user: true, lead: true },
  });

  const alerts = await prisma.alert.count({
    where: { companyId, read: false },
  });

  const metaToday = await fetchMetaToday();

  return (
    <DashboardClient
      stats={{ totalLeads, newLeads, opportunities: opportunities.length, totalRevenue, conversionRate, alerts }}
      recentActivities={recentActivities}
      userName={session?.user?.name || "Usuario"}
      metaToday={metaToday}
    />
  );
}
