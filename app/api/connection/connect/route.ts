import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { LEGACY_COMPANY_ID } from "@/lib/bot-db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// El proceso bot corre separado del proceso web — esta ruta solo deja una
// señal en disco (mismo patrón que /disconnect) que start-bot.ts revisa
// cada segundo. Es idempotente: si la sesión ya está activa, el bot no hace
// nada.
export async function POST() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || !["admin", "supervisor", "superadmin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const dataDir = path.resolve(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `.connect-${companyId}`), "");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Connect Error:", error);
    return NextResponse.json({ error: "Failed to connect" }, { status: 500 });
  }
}
