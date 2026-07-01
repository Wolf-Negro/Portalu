import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
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
import { generateAiSummary, extractLeadDetails } from "@/lib/bot-openai";

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

    // Al llegar al primer stage de calificación, crear automáticamente un
    // Lead en el CRM para que aparezca en el módulo Leads de Portalu.
    // Se usa upsert by (companyId + phone) para no duplicar si el stage
    // se reasigna; si el phone es un LID de WA (sin número real), se crea
    // igualmente pero sin campo phone.
    if (stage === "REGISTRO") {
      try {
        const [convForLead] = await sql`
          SELECT name, phone, metadata, remote_jid FROM conversations
          WHERE id = ${id} AND company_id = ${companyId}
        `;
        if (convForLead) {
          const cf      = convForLead as any;
          const isLid   = cf.remote_jid?.endsWith("@lid") ?? false;
          const realPhone = isLid ? null : (cf.phone as string | null);
          const meta    = (() => { try { return JSON.parse(cf.metadata || "{}"); } catch { return {}; } })();
          const leadName = meta.pushName ?? cf.name ?? (realPhone ?? "Contacto WhatsApp");

          // Evitar duplicado: si ya existe un Lead con ese teléfono en esta empresa, no crear otro.
          const exists = realPhone
            ? await prisma.lead.findFirst({ where: { companyId, phone: realPhone } })
            : null;
          if (!exists) {
            await prisma.lead.create({
              data: { name: leadName, phone: realPhone ?? undefined, origin: "whatsapp", status: "nuevo", companyId },
            });
          }
        }
      } catch (err) {
        console.error("[stage-api] Error creando Lead CRM desde WhatsApp:", err);
      }
    }

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

            // Lee la conversación con IA para sacar datos puntuales que el
            // lead haya mencionado (empresa, # de proveedores) — si no los
            // mencionó, queda en "—", nunca se inventa.
            const details = await extractLeadDetails(companyId, id).catch(() => null);
            const agendadoEn = new Date().toLocaleString("es-PE", {
              timeZone: "America/Lima",
              day: "2-digit", month: "2-digit", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            });

            const notifMsg = [
              `✅ *Nuevo Lead*`,
              `👤 *Nombre:* ${leadName}`,
              !isLid ? `📱 *Número:* +${phone}` : null,
              `🏢 *Empresa:* ${details?.companyName || "—"}`,
              `📦 *# de proveedores:* ${details?.numProviders || "—"}`,
              `🗓️ *Agendado:* ${agendadoEn}`,
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
