import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role === "superadmin") redirect("/admin");

  const companyId = (session.user as any).companyId as string | undefined;

  const [unreadAlerts, newLeads] = await Promise.all([
    companyId ? prisma.alert.count({ where: { companyId, read: false } }) : 0,
    companyId ? prisma.lead.count({ where: { companyId, status: "nuevo" } }) : 0,
  ]);

  const user = {
    name: session.user.name || "Usuario",
    email: session.user.email || "",
    role: (session.user as any).role || "asesor",
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#0e0e14" }}>
      <Sidebar user={user} unreadAlerts={unreadAlerts} newLeads={newLeads} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
