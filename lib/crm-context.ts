import prisma from "@/lib/prisma";
import { sql as botSql, getAppConfig, type ConvTag } from "@/lib/bot-db";

export type CrmPeriod = "today" | "yesterday" | "last_7d" | "last_30d" | "all";

function periodToRange(period: CrmPeriod | undefined): { gte?: Date; lt?: Date } {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  switch (period) {
    case "today":
      return { gte: startOfToday };
    case "yesterday": {
      const yesterday = new Date(startOfToday);
      yesterday.setDate(yesterday.getDate() - 1);
      return { gte: yesterday, lt: startOfToday };
    }
    case "last_7d": {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - 7);
      return { gte: d };
    }
    case "last_30d": {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - 30);
      return { gte: d };
    }
    default:
      return {};
  }
}

/** Resumen de leads del CRM: total histórico, nuevos en el período pedido, por estado, por origen, y los más recientes. */
export async function fetchLeadsSummary(
  companyId: string | undefined,
  status?: string,
  period: CrmPeriod = "all"
): Promise<Record<string, unknown>> {
  if (!companyId) return { error: "No se encontró la empresa del usuario." };
  try {
    const range = periodToRange(period);
    const where: any = { companyId };
    if (status) where.status = status;
    const periodWhere: any = { ...where, ...(range.gte || range.lt ? { createdAt: { gte: range.gte, lt: range.lt } } : {}) };

    const [totalHistorico, nuevosEnPeriodo, byStatusRaw, byOriginRaw, recent] = await Promise.all([
      prisma.lead.count({ where: { companyId } }),
      prisma.lead.count({ where: periodWhere }),
      prisma.lead.groupBy({ by: ["status"], where: { companyId }, _count: { _all: true } }),
      prisma.lead.groupBy({ by: ["origin"], where: { companyId }, _count: { _all: true } }),
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 10,
        select: { name: true, status: true, origin: true, createdAt: true },
      }),
    ]);

    return {
      periodoConsultado: period,
      totalHistorico,
      nuevosEnPeriodo,
      nota: totalHistorico === 0
        ? "El CRM de esta empresa no tiene NINGÚN lead registrado todavía (no es que no haya hoy — nunca se ha registrado uno). Sus leads probablemente llegan por WhatsApp y aún no se han dado de alta como leads en el CRM."
        : undefined,
      porEstado: byStatusRaw.map((r) => ({ estado: r.status, cantidad: r._count._all })),
      porOrigen: byOriginRaw.map((r) => ({ origen: r.origin, cantidad: r._count._all })),
      masRecientes: recent.map((l) => ({
        nombre: l.name,
        estado: l.status,
        origen: l.origin,
        fecha: l.createdAt.toISOString().slice(0, 10),
      })),
    };
  } catch (err) {
    console.error("[crm-context] fetchLeadsSummary error:", err);
    return { error: "No se pudo obtener la información de leads." };
  }
}

/** Resumen del pipeline de ventas: oportunidades por etapa, nuevas en el período, valor total, y cierres recientes. */
export async function fetchPipelineSummary(
  companyId: string | undefined,
  period: CrmPeriod = "all"
): Promise<Record<string, unknown>> {
  if (!companyId) return { error: "No se encontró la empresa del usuario." };
  try {
    const range = periodToRange(period);
    const periodWhere: any = { companyId, ...(range.gte || range.lt ? { createdAt: { gte: range.gte, lt: range.lt } } : {}) };

    const [totalHistorico, nuevasEnPeriodo, byStage, recentClosed] = await Promise.all([
      prisma.opportunity.count({ where: { companyId } }),
      prisma.opportunity.count({ where: periodWhere }),
      prisma.opportunity.groupBy({
        by: ["stage"],
        where: { companyId },
        _count: { _all: true },
        _sum: { value: true },
      }),
      prisma.opportunity.findMany({
        where: { companyId, stage: { in: ["cerrado_ganado", "cerrado_perdido"] } },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { title: true, value: true, stage: true, updatedAt: true },
      }),
    ]);

    const totalAbierto = byStage
      .filter((s) => !["cerrado_ganado", "cerrado_perdido"].includes(s.stage))
      .reduce((acc, s) => acc + (s._sum.value ?? 0), 0);

    return {
      periodoConsultado: period,
      totalHistorico,
      nuevasEnPeriodo,
      nota: totalHistorico === 0
        ? "El pipeline de esta empresa no tiene NINGUNA oportunidad registrada todavía (no es que no haya hoy — nunca se ha registrado una)."
        : undefined,
      porEtapa: byStage.map((s) => ({
        etapa: s.stage,
        cantidad: s._count._all,
        valorTotal: s._sum.value ?? 0,
      })),
      valorPipelineAbierto: totalAbierto,
      cierresRecientes: recentClosed.map((o) => ({
        titulo: o.title,
        valor: o.value,
        resultado: o.stage === "cerrado_ganado" ? "ganado" : "perdido",
        fecha: o.updatedAt.toISOString().slice(0, 10),
      })),
    };
  } catch (err) {
    console.error("[crm-context] fetchPipelineSummary error:", err);
    return { error: "No se pudo obtener la información del pipeline." };
  }
}

/** Resumen de WhatsApp: conversaciones totales, por modo (IA/humano), y las más recientes. */
export async function fetchWhatsAppSummary(companyId: string | undefined): Promise<Record<string, unknown>> {
  if (!companyId) return { error: "No se encontró la empresa del usuario." };
  try {
    const byMode = await botSql<{ mode: string; count: string }[]>`
      SELECT mode, count(*)::text AS count
      FROM conversations
      WHERE company_id = ${companyId}
      GROUP BY mode
    `;

    const recent = await botSql<{ name: string | null; phone: string; mode: string; tags: string; last_message_at: Date }[]>`
      SELECT name, phone, mode, tags, last_message_at
      FROM conversations
      WHERE company_id = ${companyId}
      ORDER BY last_message_at DESC
      LIMIT 10
    `;

    const totalMessagesToday = await botSql<{ count: string }[]>`
      SELECT count(*)::text AS count
      FROM messages
      WHERE company_id = ${companyId} AND timestamp >= CURRENT_DATE
    `;

    // Embudo de leads del bot de WhatsApp: cada conversación es un "lead" y su
    // etapa es la etiqueta de mayor prioridad en `tags` (igual lógica que el
    // tablero Kanban de la página WhatsApp). Las etiquetas de columna son
    // personalizables por empresa (app_config.col1_name..col4_name).
    const STAGE_ORDER: ConvTag[] = ["PAGO_DIAGNOSTICO", "ATENCION_COMERCIAL", "PRECALIFICADO", "REGISTRO"];
    const DEFAULT_LABELS: Record<ConvTag, string> = {
      REGISTRO: "Nuevo lead",
      PRECALIFICADO: "Precalificado",
      ATENCION_COMERCIAL: "Atención comercial",
      PAGO_DIAGNOSTICO: "Pago/Diagnóstico",
      NO_CALIFICA: "No califica",
    };
    const config = await getAppConfig(companyId).catch(() => null);
    const stageLabels: Record<ConvTag, string> = {
      REGISTRO: config?.col1_name?.trim() || DEFAULT_LABELS.REGISTRO,
      PRECALIFICADO: config?.col2_name?.trim() || DEFAULT_LABELS.PRECALIFICADO,
      ATENCION_COMERCIAL: config?.col3_name?.trim() || DEFAULT_LABELS.ATENCION_COMERCIAL,
      PAGO_DIAGNOSTICO: config?.col4_name?.trim() || DEFAULT_LABELS.PAGO_DIAGNOSTICO,
      NO_CALIFICA: DEFAULT_LABELS.NO_CALIFICA,
    };

    function assignStage(tags: ConvTag[]): ConvTag | null {
      for (const stage of STAGE_ORDER) if (tags.includes(stage)) return stage;
      return null;
    }

    const allWithTags = await botSql<{ tags: string; last_message_at: Date }[]>`
      SELECT tags, last_message_at FROM conversations WHERE company_id = ${companyId}
    `;
    const stageCounts: Record<string, number> = {};
    for (const row of allWithTags) {
      let tags: ConvTag[] = [];
      try { tags = JSON.parse(row.tags || "[]"); } catch { /* ignore */ }
      const stage = assignStage(tags) ?? (tags.includes("NO_CALIFICA") ? "NO_CALIFICA" : null);
      const label = stage ? stageLabels[stage] : "Sin etapa asignada";
      stageCounts[label] = (stageCounts[label] ?? 0) + 1;
    }

    return {
      totalConversaciones: byMode.reduce((acc, r) => acc + parseInt(r.count, 10), 0),
      porModo: byMode.map((r) => ({ modo: r.mode, cantidad: parseInt(r.count, 10) })),
      mensajesHoy: parseInt(totalMessagesToday[0]?.count ?? "0", 10),
      embudoLeadsWhatsApp: Object.entries(stageCounts).map(([etapa, cantidad]) => ({ etapa, cantidad })),
      conversacionesRecientes: recent.map((c) => {
        let tags: ConvTag[] = [];
        try { tags = JSON.parse(c.tags || "[]"); } catch { /* ignore */ }
        const stage = assignStage(tags);
        return {
          nombre: c.name || c.phone,
          telefono: c.phone,
          modo: c.mode,
          etapa: stage ? stageLabels[stage] : "Sin etapa asignada",
          ultimoMensaje: c.last_message_at,
        };
      }),
    };
  } catch (err) {
    console.error("[crm-context] fetchWhatsAppSummary error:", err);
    return { error: "No se pudo obtener la información de WhatsApp." };
  }
}
