import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import PipelineClient from "./PipelineClient";

export default async function PipelinePage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;

  const opportunities = await prisma.opportunity.findMany({
    where: { companyId },
    include: {
      lead: { select: { name: true, phone: true, email: true, origin: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return <PipelineClient opportunities={opportunities} companyId={companyId} />;
}
