import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, resolveConvId, LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const { conversationId } = await params;

    const textBody = await req.text();
    if (!textBody) return NextResponse.json({ error: "Body vacío" }, { status: 400 });
    const body = JSON.parse(textBody);

    const id = await resolveConvId(companyId, conversationId);
    if (!id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const VALID_MODES = new Set(["AI", "HUMAN", "DERIVED"]);
    if (!body.mode || !VALID_MODES.has(body.mode)) {
      return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
    }

    await sql`UPDATE conversations SET mode = ${body.mode} WHERE id = ${id} AND company_id = ${companyId}`;

    return NextResponse.json({ ok: true, mode: body.mode });
  } catch (error) {
    console.error("[api-mode] Error crítico:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
