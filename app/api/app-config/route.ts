import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAppConfig, updateAppConfig, emitEvent, LEGACY_COMPANY_ID, type AppConfig } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

function canManageConfig(session: any) {
  const role = session?.user?.role;
  return !!session?.user && ["admin", "supervisor", "superadmin"].includes(role);
}

function resolveCompanyId(session: any): string {
  return (session?.user as any)?.companyId || LEGACY_COMPANY_ID;
}

export async function GET() {
  const session = await auth();
  if (!canManageConfig(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = resolveCompanyId(session);

  try {
    const cfg = await getAppConfig(companyId);
    return NextResponse.json({
      ...cfg,
      openai_api_key: cfg.openai_api_key
        ? `${cfg.openai_api_key.slice(0, 7)}${"•".repeat(10)}`
        : null,
    });
  } catch {
    const { APP_CONFIG_DEFAULTS } = await import("@/lib/bot-db");
    return NextResponse.json(APP_CONFIG_DEFAULTS);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!canManageConfig(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = resolveCompanyId(session);

  try {
    const body = await req.json() as Partial<AppConfig>;
    await updateAppConfig(companyId, body);
    await emitEvent(companyId, "config:updated", {});
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
