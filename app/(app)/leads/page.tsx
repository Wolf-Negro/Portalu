import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import LeadsClient from "./LeadsClient";

export default async function LeadsPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const [leads, users] = await Promise.all([
    prisma.lead.findMany({
      where: { companyId },
      include: { asesor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { companyId },
      select: { id: true, name: true, role: true },
    }),
  ]);

  return <LeadsClient leads={leads} users={users} companyId={companyId} />;
}
