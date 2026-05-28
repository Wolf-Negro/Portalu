import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import AluIAClient from "./AluIAClient";

export default async function AluIAPage() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId;
  const userId = (session?.user as any)?.id;

  const [alerts, weeklySummaries, chatHistory] = await Promise.all([
    prisma.alert.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.weeklySummary.findMany({
      where: { companyId },
      orderBy: { weekStart: "desc" },
      take: 5,
    }),
    prisma.aluMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      take: 50,
    }).then((msgs) => msgs.map((m) => ({ ...m, role: m.role as "user" | "assistant" }))),
  ]);

  return (
    <AluIAClient
      alerts={alerts}
      weeklySummaries={weeklySummaries}
      chatHistory={chatHistory}
      userId={userId}
      companyId={companyId}
    />
  );
}
