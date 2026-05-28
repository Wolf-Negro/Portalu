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
    <div style={{ background: "#080812", minHeight: "100vh", color: "#e9e8e6" }}>
      <AdminTopBar user={user} />
      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>{children}</main>
    </div>
  );
}
