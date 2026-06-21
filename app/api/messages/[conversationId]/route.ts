import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, getMessages, insertMessage, enqueueOutbox, resolveConvId, LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json([], { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const { conversationId } = await params;
    const id = await resolveConvId(companyId, conversationId);
    if (!id) return NextResponse.json([]);
    return NextResponse.json(await getMessages(companyId, id) || []);
  } catch {
    return NextResponse.json([]);
  }
}

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

    const textContent = body.content || body.text;

    const id = await resolveConvId(companyId, conversationId);
    if (!id) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (!textContent) {
      return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });
    }

    await insertMessage(companyId, id, "human", textContent);

    const [row] = await sql`SELECT remote_jid, phone FROM conversations WHERE id = ${id} AND company_id = ${companyId}`;
    if (row) {
      const target = (row as any).remote_jid || (row as any).phone;
      if (target) {
        await enqueueOutbox(companyId, id, target, textContent);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api-post] Error crítico:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
