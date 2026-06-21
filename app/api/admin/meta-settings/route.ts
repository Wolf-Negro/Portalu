import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMetaSettings, updateMetaSettings, LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

// TODO(Fase 5): este panel hoy edita la configuración global (empresa legacy).
// Cuando exista selección de empresa en el panel de superadmin, recibir
// companyId explícito en vez de usar siempre LEGACY_COMPANY_ID.
function isSuperAdmin(session: any) {
  return session?.user && (session.user as any).role === "superadmin";
}

export async function GET() {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const settings = await getMetaSettings(LEGACY_COMPANY_ID);
    const masked = settings
      ? {
          pixel_id:        settings.pixel_id,
          access_token:    settings.access_token
            ? `${settings.access_token.slice(0, 6)}${"•".repeat(10)}`
            : "",
          test_event_code: settings.test_event_code,
          token_invalid:   settings.token_invalid ?? false,
        }
      : { pixel_id: "", access_token: "", test_event_code: "", token_invalid: false };

    return NextResponse.json(masked);
  } catch {
    return NextResponse.json({ error: "Error al leer configuración" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json() as {
      pixel_id?: string;
      access_token?: string;
      test_event_code?: string;
    };

    const current  = await getMetaSettings(LEGACY_COMPANY_ID);
    const newToken = body.access_token && !body.access_token.includes("•")
      ? body.access_token.trim()
      : current?.access_token ?? "";

    await updateMetaSettings(LEGACY_COMPANY_ID, {
      pixel_id:        body.pixel_id?.trim()        ?? current?.pixel_id        ?? "",
      access_token:    newToken,
      test_event_code: body.test_event_code?.trim() ?? current?.test_event_code ?? "",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error al guardar configuración" }, { status: 500 });
  }
}
