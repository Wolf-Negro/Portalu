import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  sql,
  resolveConvId,
  addConvTag,
  removeConvTag,
  getConvTags,
  emitEvent,
  getAppConfig,
  LEGACY_COMPANY_ID,
  type ConvTag,
} from "@/lib/bot-db";
import { enviarEventoMetaCAPI } from "@/lib/bot-meta-capi";

export const dynamic = "force-dynamic";

const VALID_TAGS = new Set<ConvTag>([
  "REGISTRO",
  "PRECALIFICADO",
  "ATENCION_COMERCIAL",
  "PAGO_DIAGNOSTICO",
  "NO_CALIFICA",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const { conversationId } = await params;
    const id = await resolveConvId(companyId, conversationId);
    if (!id) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

    const body = await req.json() as { add?: string; remove?: string };

    if (body.add) {
      if (!VALID_TAGS.has(body.add as ConvTag)) {
        return NextResponse.json({ error: "Etiqueta inválida" }, { status: 400 });
      }
      await addConvTag(companyId, id, body.add as ConvTag);

      if (body.add === "PAGO_DIAGNOSTICO") {
        await sql`UPDATE conversations SET mode = 'HUMAN' WHERE id = ${id} AND company_id = ${companyId}`;
        await emitEvent(companyId, "mode:update", { conversationId: id, mode: "HUMAN" });

        const [conv] = await sql`SELECT phone FROM conversations WHERE id = ${id} AND company_id = ${companyId}`;

        if ((conv as any)?.phone) {
          const cfg   = await getAppConfig(companyId);
          const valor = cfg.valor_conversion ?? 380;
          enviarEventoMetaCAPI(companyId, "Purchase", { phone: (conv as any).phone, value: valor }).catch((err) =>
            console.error("[tags-api] CAPI Purchase error:", err)
          );
        }
      }

      await emitEvent(companyId, "tag:update", { conversationId: id, add: body.add });
    }

    if (body.remove) {
      if (!VALID_TAGS.has(body.remove as ConvTag)) {
        return NextResponse.json({ error: "Etiqueta inválida" }, { status: 400 });
      }
      await removeConvTag(companyId, id, body.remove as ConvTag);
      await emitEvent(companyId, "tag:update", { conversationId: id, remove: body.remove });
    }

    return NextResponse.json({ ok: true, tags: await getConvTags(companyId, id) });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
