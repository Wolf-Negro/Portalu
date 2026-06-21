import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/dashboard/context
// Returns a business context summary for ALU.IA onboarding
// ─────────────────────────────────────────────────────────────────────────────

interface LeadByOrigin {
  origin: string;
  _count: { _all: number };
}

interface CampaignRow {
  id: string;
  name: string;
  platform: string;
  status: string;
  spent: number;
  leads: number;
  cpl: number;
  ctr: number;
  reach: number;
}

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const userId = (session.user as { id?: string }).id;
  const companyId = (session.user as { companyId?: string }).companyId;

  if (!userId || !companyId) {
    return NextResponse.json({ error: "Sesión incompleta" }, { status: 400 });
  }

  try {
    // ── Parallel queries ──────────────────────────────────────────────────────
    const [
      company,
      campaigns,
      leadsByOriginRaw,
      totalLeads,
      totalOpportunities,
      closedWon,
      currentUser,
    ] = await Promise.all([
      prisma.company.findUnique({
        where: { id: companyId },
        select: { name: true },
      }),

      prisma.campaign.findMany({
        where: { companyId },
        select: { id: true, name: true, platform: true, status: true, spent: true, leads: true, cpl: true, ctr: true, reach: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),

      prisma.lead.groupBy({
        by: ["origin"],
        where: { companyId },
        _count: { _all: true },
      }),

      prisma.lead.count({ where: { companyId } }),

      prisma.opportunity.count({ where: { companyId } }),

      prisma.opportunity.count({
        where: { companyId, stage: "cerrado_ganado" },
      }),

      prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      }),
    ]);

    const companyName = company?.name ?? "Tu empresa";
    const userName = currentUser?.name ?? "Usuario";

    // ── Build summary string ──────────────────────────────────────────────────

    const activeCampaigns = (campaigns as CampaignRow[]).filter(
      (c) => c.status === "active" || c.status === "ACTIVE"
    );

    const campaignLines = (campaigns as CampaignRow[])
      .map((c) => {
        const platform =
          c.platform === "meta" || c.platform === "META"
            ? "Meta Ads"
            : c.platform;
        const statusLabel =
          c.status === "active" || c.status === "ACTIVE" ? "Activa" : "Pausada";
        return (
          `- "${c.name}" → Plataforma: ${platform} | Estado: ${statusLabel} | ` +
          `Inversión: S/ ${c.spent.toFixed(2)} | Leads: ${c.leads} | ` +
          `CPL: S/ ${c.cpl.toFixed(2)} | CTR: ${c.ctr.toFixed(2)}%`
        );
      })
      .join("\n");

    const leadsByOrigin = leadsByOriginRaw as LeadByOrigin[];
    const originLines = leadsByOrigin
      .map((row) => {
        const pct =
          totalLeads > 0
            ? ((row._count._all / totalLeads) * 100).toFixed(1)
            : "0.0";
        return `${row.origin} ${row._count._all} (${pct}%)`;
      })
      .join(" | ");

    const conversionRateNum =
      totalOpportunities > 0
        ? ((closedWon / totalOpportunities) * 100).toFixed(1)
        : "0.0";

    const summary =
      `Empresa: ${companyName}\n` +
      `Campañas activas: ${activeCampaigns.length}\n` +
      (campaignLines ? campaignLines + "\n" : "") +
      `Leads por canal: ${originLines || "Sin datos"}\n` +
      `Total leads: ${totalLeads} | Oportunidades: ${totalOpportunities} | ` +
      `Ventas cerradas: ${closedWon} | Tasa conversión: ${conversionRateNum}%`;

    // ── Response ──────────────────────────────────────────────────────────────
    return NextResponse.json({
      summary,
      userName,
      companyName,
      hasCampaigns: campaigns.length > 0,
      totalLeads,
      conversionRate: `${conversionRateNum}%`,
    });
  } catch (error) {
    console.error("[dashboard/context] Error:", error);
    return NextResponse.json(
      { error: "Error obteniendo contexto del negocio" },
      { status: 500 }
    );
  }
}
