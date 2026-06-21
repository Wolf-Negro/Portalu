import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  sql,
  resolveConvId,
  getConvTags,
  setConvTags,
  emitEvent,
  getAppConfig,
  isMetaLeadSent,
  markMetaLeadSent,
  updateAiSummary,
  enqueueOutbox,
  LEGACY_COMPANY_ID,
  type ConvTag,
} from "@/lib/bot-db";
import { enviarEventoMetaCAPI } from "@/lib/bot-meta-capi";
import { generateAiSummary } from "@/lib/bot-openai";

export const dynamic = "force-dynamic";

const STAGE_TAGS = new Set<ConvTag>([
  "REGISTRO",
  "PRECALIFICADO",
  "ATENCION_COMERCIAL",
  "PAGO_DIAGNOSTICO",
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

    const body  = await req.json() as { stage?: string };
    const stage = body.stage as ConvTag | undefined;

    if (!stage || !STAGE_TAGS.has(stage)) {
      return NextResponse.json({ error: "Etapa inválida" }, { status: 400 });
    }

    const current  = await getConvTags(companyId, id);
    const nonStage = current.filter((t) => !STAGE_TAGS.has(t));
    await setConvTags(companyId, id, [...nonStage, stage]);

    if (stage === "PRECALIFICADO" || stage === "ATENCION_COMERCIAL") {
      generateAiSummary(companyId, id)
        .then(async (summary) => { if (summary) await updateAiSummary(companyId, id, summary); })
        .catch(() => {});
    }

    await emitEvent(companyId, "chat:updated", { conversationId: id, stage });

    const [convRow] = await sql`SELECT phone FROM conversations WHERE id = ${id} AND company_id = ${companyId}`;

    if ((convRow as any)?.phone) {
      const phone = (convRow as any).phone as string;
      const cfg   = await getAppConfig(companyId);

      const leadAlreadySent = await isMetaLeadSent(companyId, id);

      if (stage === "ATENCION_COMERCIAL") {
        if (!leadAlreadySent) {
          await markMetaLeadSent(companyId, id);
          enviarEventoMetaCAPI(companyId, "Lead", { phone }).catch((err) =>
            console.error("[stage-api] CAPI Lead error:", err)
          );
        } else {
          console.log(`[stage-api] Lead Meta CAPI ya enviado para conv ${id} — omitido.`);
        }

        if (cfg.whatsapp_asesor?.trim()) {
          try {
            const asesorPhone = cfg.whatsapp_asesor.trim().replace(/\D/g, "");
            const [convFull]  = await sql`
              SELECT name, ai_summary, metadata, remote_jid FROM conversations
              WHERE id = ${id} AND company_id = ${companyId}
            `;
            const cf       = convFull as any;
            const meta     = (() => { try { return JSON.parse(cf?.metadata || "{}"); } catch { return {}; } })();
            const leadName = meta.pushName ?? cf?.name ?? phone;
            const summary  = cf?.ai_summary ?? null;
            const isLid    = cf?.remote_jid?.endsWith("@lid") ?? false;

            const notifMsg = [
              `✅ *Nuevo Lead*`,
              `👤 *Nombre:* ${leadName}`,
              !isLid ? `📱 *Teléfono:* +${phone}` : null,
              summary ? `📋 *Resumen:* ${summary}` : null,
            ].filter(Boolean).join("\n");

            await enqueueOutbox(companyId, id, asesorPhone, notifMsg);
            console.log(`[stage-api] Notificación a asesora encolada (${asesorPhone})`);
          } catch (err) {
            console.error("[stage-api] Error encolando notificación a asesora:", err);
          }
        }
      }

      if (stage === "PAGO_DIAGNOSTICO") {
        const wasInAtencion = current.includes("ATENCION_COMERCIAL");
        if (!wasInAtencion && !leadAlreadySent) {
          await markMetaLeadSent(companyId, id);
          enviarEventoMetaCAPI(companyId, "Lead", { phone }).catch((err) =>
            console.error("[stage-api] CAPI Lead (cascade) error:", err)
          );
        }
        enviarEventoMetaCAPI(companyId, "Purchase", {
          phone,
          value: cfg.valor_conversion > 0 ? cfg.valor_conversion : 380,
        }).catch((err) =>
          console.error("[stage-api] CAPI Purchase error:", err)
        );
      }
    }

    return NextResponse.json({ ok: true, tags: await getConvTags(companyId, id) });
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
