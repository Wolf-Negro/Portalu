import { auth } from "@/auth";
import { redirect } from "next/navigation";
import AdminTopBar from "@/components/admin/AdminTopBar";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "superadmin") redirect("/dashboard");

  const user = {
    name: session.user.name || "Super Admin",
    email: session.user.email || "",
  };

  return (
    <ThemeProvider>
      <div style={{ background: "var(--color-surface-0)", minHeight: "100vh", color: "var(--color-text-primary)" }}>
        <AdminTopBar user={user} />
        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px" }}>{children}</main>
      </div>
    </ThemeProvider>
  );
}
