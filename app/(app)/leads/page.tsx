import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const PAGE_SIZE = 100;

  const [leads, total, users] = await Promise.all([
    prisma.lead.findMany({
      where: { companyId },
      include: { asesor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
    }),
    prisma.lead.count({ where: { companyId } }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, role: true },
    }),
  ]);

  return (
    <LeadsClient
      leads={leads}
      total={total}
      pageSize={PAGE_SIZE}
      users={users}
      companyId={companyId}
    />
  );
}
