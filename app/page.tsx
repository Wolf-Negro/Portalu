import { redirect } from "next/navigation";
import { auth } from "@/auth";

export default async function RootPage() {
  const session = await auth();
  if (session?.user) {
    const role = (session.user as any).role;
    if (role === "superadmin") redirect("/admin");
    redirect("/dashboard");
  }
  redirect("/landing");
}
