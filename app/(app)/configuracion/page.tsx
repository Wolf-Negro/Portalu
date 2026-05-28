import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ConfiguracionClient from "./ConfiguracionClient";

export default async function ConfiguracionPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  const userId = (session?.user as any)?.id;

  const [company, users] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.user.findMany({ where: { companyId }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
  ]);

  return <ConfiguracionClient company={company} users={users} currentUserId={userId} />;
}
