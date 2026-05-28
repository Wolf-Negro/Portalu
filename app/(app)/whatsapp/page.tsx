import prisma from "@/lib/prisma";
import WhatsAppClient from "./WhatsAppClient";

export default async function WhatsAppPage() {
  const conversations = await prisma.conversation.findMany({
    include: { messages: { orderBy: { createdAt: "asc" } } },
    orderBy: { updatedAt: "desc" },
  });
  return <WhatsAppClient conversations={conversations} />;
}
