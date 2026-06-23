import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminTopBar from "@/components/admin/AdminTopBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "superadmin") redirect("/dashboard");

  const user = {
    name: session.user.name || "Super Admin",
    email: session.user.email || "",
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <AdminTopBar user={user} />
      <main className="light" style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", background: "var(--color-surface-0)", color: "var(--color-text-primary)", minHeight: "calc(100vh - 56px)" }}>{children}</main>
    </div>
  );
}
