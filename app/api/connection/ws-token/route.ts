import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

// El servidor WebSocket (lib/bot-ws-server.ts) corre fuera de Next.js y no
// tiene acceso a la sesión de NextAuth. El frontend pide aquí su companyId
// (resuelto server-side, nunca confiado del cliente) antes de conectar el WS.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;
  return NextResponse.json({ companyId });
}
