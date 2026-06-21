import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, getAppConfig, LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

export interface KpiPayload {
  conversionRate:       number;
  totalLeads:           number;
  qualifiedLeads:       number;
  noCalificaCount:      number;
  avgDerivationMinutes: number | null;
}

export async function GET(): Promise<Response> {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const rows = await sql`SELECT tags FROM conversations WHERE company_id = ${companyId}`;

    let totalLeads      = 0;
    let qualifiedLeads  = 0;
    let noCalificaCount = 0;

    const QUALIFIED = new Set(["PRECALIFICADO", "ATENCION_COMERCIAL", "PAGO_DIAGNOSTICO"]);

    for (const row of rows as any[]) {
      totalLeads++;
      let tags: string[];
      try { tags = JSON.parse(row.tags || "[]"); } catch { tags = []; }

      if (tags.some((t) => QUALIFIED.has(t))) qualifiedLeads++;
      if (tags.includes("NO_CALIFICA"))        noCalificaCount++;
    }

    const conversionRate =
      totalLeads > 0
        ? Math.round((qualifiedLeads / totalLeads) * 1000) / 10
        : 0;

    const cfg        = await getAppConfig(companyId);
    const asesorLike = cfg.nombre_asesor?.trim()
      ? `%${cfg.nombre_asesor.trim()}%`
      : null;

    const derivRows = await sql`
      SELECT
        EXTRACT(EPOCH FROM MIN(m_start.timestamp))::INTEGER AS start_ts,
        EXTRACT(EPOCH FROM MIN(m_deriv.timestamp))::INTEGER AS deriv_ts
      FROM conversations c
      JOIN messages m_start
        ON m_start.conversation_id = c.id
      LEFT JOIN messages m_deriv
        ON  m_deriv.conversation_id = c.id
        AND m_deriv.from_me = 1
        AND (
              m_deriv.text LIKE '%Te conecto%'
           OR m_deriv.text LIKE '%asesor humano%'
           OR (${asesorLike} IS NOT NULL AND m_deriv.text LIKE ${asesorLike})
        )
      WHERE c.company_id = ${companyId}
        AND (c.tags LIKE '%ATENCION_COMERCIAL%' OR c.tags LIKE '%PAGO_DIAGNOSTICO%')
      GROUP BY c.id
      HAVING EXTRACT(EPOCH FROM MIN(m_start.timestamp))::INTEGER IS NOT NULL
         AND EXTRACT(EPOCH FROM MIN(m_deriv.timestamp))::INTEGER IS NOT NULL
         AND EXTRACT(EPOCH FROM MIN(m_deriv.timestamp))::INTEGER
           > EXTRACT(EPOCH FROM MIN(m_start.timestamp))::INTEGER
    `;

    let avgDerivationMinutes: number | null = null;
    if (derivRows.length > 0) {
      const totalSeconds = (derivRows as any[]).reduce(
        (sum, r) => sum + (r.deriv_ts - r.start_ts),
        0
      );
      avgDerivationMinutes =
        Math.round((totalSeconds / derivRows.length / 60) * 10) / 10;
    }

    return NextResponse.json({
      conversionRate,
      totalLeads,
      qualifiedLeads,
      noCalificaCount,
      avgDerivationMinutes,
    } satisfies KpiPayload);
  } catch (err) {
    console.error("[kpis] Error calculando métricas:", err);
    return NextResponse.json(
      { error: "Error calculando KPIs" },
      { status: 500 }
    );
  }
}
