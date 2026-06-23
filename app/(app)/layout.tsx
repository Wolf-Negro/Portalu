import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Sidebar from "@/components/layout/Sidebar";
import { ToastProvider } from "@/components/ui/toast";
import AluIAFloating from "@/components/alu-ia/AluIAFloating";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role === "superadmin") redirect("/admin");

  const userId = (session.user as any).id as string;
  const companyId = (session.user as any).companyId as string | undefined;

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingDone: true } as any,
  });
  if (!(dbUser as any)?.onboardingDone) redirect("/onboarding");

  const [unreadAlerts, newLeads, company] = await Promise.all([
    companyId ? prisma.alert.count({ where: { companyId, read: false } }) : 0,
    companyId ? prisma.lead.count({ where: { companyId, status: "nuevo" } }) : 0,
    companyId ? prisma.company.findUnique({ where: { id: companyId }, select: { name: true, logo: true } }) : null,
  ]);

  const user = {
    name: session.user.name || "Usuario",
    email: session.user.email || "",
    role: (session.user as any).role || "asesor",
  };

  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          user={user}
          unreadAlerts={unreadAlerts}
          newLeads={newLeads}
          companyLogo={(company as any)?.logo ?? undefined}
          companyName={company?.name ?? undefined}
        />
        <main className="light flex-1 overflow-y-auto overflow-x-hidden" style={{ background: "var(--color-surface-0)" }}>
          {children}
        </main>
      </div>
      <AluIAFloating />
    </ToastProvider>
  );
}
