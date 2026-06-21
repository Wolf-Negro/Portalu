import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getConfiguracionMeta, updateConfiguracionMeta, LEGACY_COMPANY_ID } from "@/lib/bot-db";

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
    const cfg = await getConfiguracionMeta(companyId);
    return NextResponse.json({
      pixel_id:        cfg?.pixel_id        ?? "",
      capi_token:      cfg?.capi_token
        ? `${cfg.capi_token.slice(0, 6)}${"•".repeat(12)}`
        : "",
      test_event_code: cfg?.test_event_code ?? "",
      token_invalid:   cfg?.token_invalid   ?? false,
      updated_at:      cfg?.updated_at      ?? null,
    });
  } catch {
    return NextResponse.json({ error: "Error al leer configuración" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!canManageConfig(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = resolveCompanyId(session);

  try {
    const body = await req.json() as {
      pixel_id?:        string;
      capi_token?:      string;
      test_event_code?: string;
    };

    const current  = await getConfiguracionMeta(companyId);
    const newToken = body.capi_token && !body.capi_token.includes("•")
      ? body.capi_token.trim()
      : current?.capi_token ?? "";

    await updateConfiguracionMeta(companyId, {
      pixel_id:        body.pixel_id?.trim()        ?? current?.pixel_id        ?? "",
      capi_token:      newToken,
      test_event_code: body.test_event_code?.trim() ?? current?.test_event_code ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
