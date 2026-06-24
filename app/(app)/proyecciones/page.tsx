import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ProyeccionesClient from "./ProyeccionesClient";

export default async function ProyeccionesPage() {
  const session = await auth();
  if ((session?.user as any)?.role === "asesor") redirect("/dashboard");
  return <ProyeccionesClient />;
}
