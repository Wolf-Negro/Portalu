import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ReportesClient from "./ReportesClient";

async function getMonthlyData() {
  const ranges = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    return {
      mes: date.toLocaleString("es-PE", { month: "short" }),
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59),
    };
  });

  const results = await Promise.all(
    ranges.map(async ({ mes, start, end }) => {
      const [leadsCount, closedOpps, revenue] = await Promise.all([
        prisma.lead.count({ where: { createdAt: { gte: start, lte: end } } }),
        prisma.opportunity.count({ where: { stage: "cerrado_ganado", closedAt: { gte: start, lte: end } } }),
        prisma.opportunity.aggregate({ _sum: { value: true }, where: { stage: "cerrado_ganado", closedAt: { gte: start, lte: end } } }),
      ]);
      return { mes, leads: leadsCount, ventas: closedOpps, ingresos: revenue._sum.value || 0 };
    })
  );

  return results;
}

export default async function ReportesPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [leads, opportunities, campaigns, users, monthlyData] = await Promise.all([
    prisma.lead.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } }),
    prisma.opportunity.findMany({ where: { companyId } }),
    prisma.campaign.findMany({ where: { companyId } }),
    prisma.user.findMany({ where: { companyId }, select: { id: true, name: true, role: true } }),
    getMonthlyData(),
  ]);

  return (
    <ReportesClient
      leads={leads}
      opportunities={opportunities}
      campaigns={campaigns}
      users={users}
      monthlyData={monthlyData}
    />
  );
}
