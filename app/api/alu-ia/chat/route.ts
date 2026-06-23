import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSystemConfig } from "@/lib/system-config";
import { auth } from "@/auth";
import { fetchAccountMetrics, fetchCampaignsWithInsights, type MetaPeriod } from "@/lib/meta-insights";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Context = "dashboard" | "campanas" | "leads" | "general" | "onboarding";

interface DashboardStats {
  totalLeads?: number;
  newLeads?: number;
  opportunities?: number;
  totalRevenue?: number;
  conversionRate?: string;
  pipelineValue?: number;
  closedWon?: number;
  alerts?: number;
}

interface ChatRequestBody {
  message: string;
  userId?: string;
  context?: Context;
  stats?: DashboardStats;
  onboardingContext?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base system prompt
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Eres ALU.IA, el asistente de inteligencia artificial de PORTALU by Alucinando.
Eres un experto en marketing digital, ventas, publicidad en Meta Ads y estrategia de negocio.
Respondes siempre en español, de forma concisa, directa y orientada a acción.
Conoces el contexto del negocio del usuario: sus leads, campañas, conversiones y métricas.
Cuando des recomendaciones, sé específico y basado en datos.

CÓMO PRESENTAR DATOS DE META ADS (el usuario normalmente NO es experto en marketing, y quiere algo rápido, no un informe):
- Responde en máximo 3-4 LÍNEAS de texto corrido, sin encabezados en negrita, sin secciones tipo "Resumen general / Detalles / Recomendación", sin emojis decorativos. Una sola recomendación al final, en la misma línea o la siguiente.
- PROHIBIDO usar tablas markdown salvo que el usuario pida explícitamente "detalle de cada campaña" o "tabla". Por defecto da solo el agregado (gasto total, leads/resultados totales, costo por resultado) y nombra como máximo LA campaña que mejor funcionó — nunca listes campaña por campaña.
- Nunca uses los nombres técnicos internos de Meta (OUTCOME_LEADS, OUTCOME_ENGAGEMENT, etc.) — di "campaña de mensajes", "de clientes potenciales", "de tráfico".
- No uses siglas (CPL, CTR, CPM, ROAS) — dilo en palabras: en vez de "CPL: S/7.93" di "cada lead te cuesta S/7.93".
- Ejemplo de respuesta correcta para "dame un reporte de mis campañas": "En los últimos 30 días gastaste S/ 6,270 y generaste 791 leads, a S/ 7.92 cada uno. La que mejor funcionó fue 'Campaña CBO 50 Look a like'. Te recomiendo subirle presupuesto." — y nada más, salvo que pidan más detalle.

FUNCIONALIDADES DE PORTALU QUE DEBES CONOCER:
- Módulo Campañas: muestra métricas de Meta Ads en tiempo real. Cada campaña tiene badge de objetivo (Generación de Leads, Conversiones, Alcance, etc.) y métricas destacadas según el objetivo.
- Gráfico de leads por hora: en el módulo Campañas, al seleccionar una campaña con objetivo "Generación de Leads" o "OUTCOME_LEADS", aparece automáticamente un gráfico de barras que muestra la distribución horaria de leads (00:00-23:00). Muestra la hora pico y un insight de cuándo llegan más leads.
- Dashboard configurable: el usuario puede activar/desactivar widgets (gráficos, equipo, Meta Ads, etc.) con el botón de engranaje.
- Pipeline: gestión visual de oportunidades con etapas.
- Leads: lista y gestión de contactos con estados y seguimiento.
- Proyecciones: simulador de inversión publicitaria con embudo de conversión.

Cuando el usuario pida ver un gráfico que ya existe en la plataforma, dirígelo al módulo correcto en lugar de decir que no puedes generarlo. Por ejemplo, si pide el gráfico de horas de leads, dile que vaya a Campañas y seleccione su campaña de generación de leads.

DATOS REALES DE META ADS:
Tienes herramientas para consultar datos REALES y actuales de la cuenta de Meta Ads del usuario (gasto, leads, CPL, alcance, impresiones, CTR, etc.), tanto de la cuenta completa como de campañas individuales por nombre. Úsalas SIEMPRE que el usuario pregunte por gasto, resultados, rendimiento o cualquier dato de sus campañas — nunca inventes ni estimes una cifra. Si la herramienta devuelve un error (por ejemplo, credenciales no configuradas) o no hay datos, dilo claramente al usuario en vez de aparentar que tienes el dato.`;

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding system prompt
// ─────────────────────────────────────────────────────────────────────────────

const ONBOARDING_SYSTEM_PROMPT = `Eres ALU.IA en modo CONFIGURACIÓN DE DASHBOARD de Portalu CRM.
Tu único objetivo: personalizar la vista del dashboard para este usuario. NO analices el negocio, NO des consejos de marketing. Solo configura el dashboard.

CONTEXTO DEL NEGOCIO (solo para referencia):
{onboardingContext}

FLUJO OBLIGATORIO — sigue este orden exactamente:

TURNO 1 (tu primer mensaje):
Saluda en UNA sola oración corta y cálida. Luego haz SOLO esta pregunta:
"¿Qué quieres ver primero cuando abres el dashboard?"
Presenta estas opciones numeradas:
1. Resumen de leads y métricas clave (leads nuevos, pipeline, ingresos)
2. Rendimiento de campañas Meta Ads del día
3. Gráfico de evolución de los últimos 30 días
4. Todo (dashboard completo con todo visible)

TURNO 2 (tu segundo mensaje):
Haz SOLO esta pregunta:
"¿Usas el seguimiento de tu equipo de ventas en Portalu?"
Ofrece:
a) Sí, lo reviso seguido → activo el panel de equipo y actividades
b) A veces → lo incluyo pero sin prioridad
c) No por ahora → lo dejo oculto

TURNO 3 (tu tercer mensaje):
Con esas 2 respuestas configura el dashboard:
— Emite [WIDGET:id] para cada widget que debe estar activo
— Emite [HIDE:id] para los que no necesita
— Emite [ORDER:id1,id2,...] ordenando de más a menos importante
— Emite [GOAL:objetivo] basado en lo que eligió primero
— Explica en 1 oración qué configuraste y por qué
— Termina obligatoriamente con [CONFIGURED]

REGLAS:
- Una sola pregunta por turno
- Nunca afirmes datos del negocio (campañas, leads, etc.) como si fueran seguros — podrían estar desactualizados
- Si el usuario ya menciona qué quiere ver, salta directo al turno 3
- Respuestas cortas: máximo 5 líneas por turno

WIDGETS DISPONIBLES: stat_cards, performance_chart, meta_today, origin_chart, team, weekly_summary, activities
OBJETIVOS: aumentar_leads, mejorar_cierre, reducir_cpl, escalar_equipo, mejorar_campañas, fidelizar`;

// ─────────────────────────────────────────────────────────────────────────────
// Tools (function calling) — datos reales de Meta Ads
// ─────────────────────────────────────────────────────────────────────────────

const VALID_PERIODS: MetaPeriod[] = ["today", "yesterday", "last_7d", "last_30d"];

const META_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_account_metrics",
      description:
        "Obtiene métricas reales agregadas de TODA la cuenta de Meta Ads del usuario (todas las campañas juntas) para un período. Úsala cuando el usuario pregunte por gasto, leads, CPL, alcance, impresiones, CTR, etc. sin mencionar una campaña concreta.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: VALID_PERIODS,
            description: "Período de tiempo a consultar.",
          },
        },
        required: ["period"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_campaigns",
      description:
        "Lista las campañas de Meta Ads del usuario con su gasto, leads, CPL, CTR y estado para un período. Úsala cuando el usuario mencione una campaña específica por nombre, o pida comparar campañas entre sí.",
      parameters: {
        type: "object",
        properties: {
          period: {
            type: "string",
            enum: VALID_PERIODS,
            description: "Período de tiempo a consultar.",
          },
        },
        required: ["period"],
      },
    },
  },
];

interface ToolCallAccumulator {
  id: string;
  name: string;
  arguments: string;
}

async function executeMetaTool(
  name: string,
  args: Record<string, unknown>,
  companyId: string | undefined
): Promise<Record<string, unknown>> {
  const period = VALID_PERIODS.includes(args.period as MetaPeriod)
    ? (args.period as MetaPeriod)
    : "today";

  if (name === "get_account_metrics") {
    return fetchAccountMetrics(companyId, period);
  }
  if (name === "list_campaigns") {
    return fetchCampaignsWithInsights(companyId, period);
  }
  return { error: "Herramienta desconocida." };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds an optional block describing the dashboard stats provided by the
 * client. Only added when context === "dashboard" and stats are present.
 */
function buildDashboardContextBlock(stats: DashboardStats): string {
  const fmt = (n: number | undefined, prefix = "") =>
    n !== undefined ? `${prefix}${n.toLocaleString("es-PE")}` : "N/D";

  return (
    "\n\nCONTEXTO ACTUAL DEL DASHBOARD DEL USUARIO:\n" +
    `- Total de leads: ${fmt(stats.totalLeads)}\n` +
    `- Leads nuevos: ${fmt(stats.newLeads)}\n` +
    `- Oportunidades activas: ${fmt(stats.opportunities)}\n` +
    `- Ingresos totales: S/ ${fmt(stats.totalRevenue)}\n` +
    `- Tasa de conversión: ${stats.conversionRate !== undefined ? stats.conversionRate + "%" : "N/D"}\n` +
    `- Valor en pipeline: S/ ${fmt(stats.pipelineValue)}\n` +
    `- Ventas cerradas: ${fmt(stats.closedWon)}\n` +
    `- Alertas sin leer: ${fmt(stats.alerts)}\n` +
    "\nEl usuario está viendo su dashboard. Responde con insights específicos basados en estos datos reales."
  );
}

/** Widget suggestion block appended when the user expresses configuration intent. */
const WIDGET_SUGGESTION_BLOCK = `

Si el usuario pide ver algo específico en el dashboard, incluye al final de tu respuesta los tags [WIDGET:nombre] para los widgets relevantes.
Widgets disponibles: [WIDGET:stat_cards], [WIDGET:performance_chart], [WIDGET:origin_chart], [WIDGET:team], [WIDGET:weekly_summary], [WIDGET:meta_today], [WIDGET:activities]
Ejemplo: Si pide ver el equipo, añade [WIDGET:team] al final de tu respuesta.`;

/**
 * Returns true when the user message suggests they want to configure or display
 * something specific on the dashboard.
 */
function detectsWidgetIntent(message: string): boolean {
  const lower = message.toLowerCase();

  const actionPatterns = [
    "quiero ver",
    "muéstrame",
    "muestrame",
    "activa",
    "pon ",
    "configura",
    "agrega",
    "añade",
    "anade",
  ];

  const widgetKeywords = [
    "gráfico",
    "grafico",
    "chart",
    "equipo",
    "rendimiento",
    "origen",
    "meta",
    "resumen",
    "actividad",
    "actividades",
    "pipeline",
    "estadísticas",
    "estadisticas",
    "widget",
  ];

  const hasAction = actionPatterns.some((p) => lower.includes(p));
  const hasKeyword = widgetKeywords.some((k) => lower.includes(k));

  return hasAction && hasKeyword;
}

/**
 * Lee un stream SSE de OpenAI con buffer (preserva líneas/bytes UTF-8
 * incompletos entre paquetes de red). Acumula el texto (vía onTextDelta) y
 * los tool_calls parciales por índice. Devuelve el contenido final, los
 * tool_calls completos y el finish_reason.
 */
async function drainOpenAIStream(
  response: Response,
  onTextDelta: (delta: string) => void
): Promise<{ content: string; toolCalls: ToolCallAccumulator[]; finishReason: string | null }> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let finishReason: string | null = null;
  const toolCallsByIndex = new Map<number, ToolCallAccumulator>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
      try {
        const parsed = JSON.parse(line.slice(6));
        const choice = parsed.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;

        const delta = choice.delta;
        if (delta?.content) {
          content += delta.content;
          onTextDelta(delta.content);
        }
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            const existing = toolCallsByIndex.get(idx) ?? { id: "", name: "", arguments: "" };
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.name += tc.function.name;
            if (tc.function?.arguments) existing.arguments += tc.function.arguments;
            toolCallsByIndex.set(idx, existing);
          }
        }
      } catch {
        // Línea SSE incompleta o malformada — ignorar y seguir.
      }
    }
  }

  return { content, toolCalls: Array.from(toolCallsByIndex.values()), finishReason };
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  const body: ChatRequestBody = await req.json();
  const { message, context, stats, onboardingContext } = body;

  // userId from session takes priority; body.userId kept for backwards compat
  const userId = (session?.user as any)?.id || body.userId;
  const companyId = (session?.user as any)?.companyId as string | undefined;

  if (!message || !userId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const apiKey = await getSystemConfig("OPENAI_API_KEY");
  if (!apiKey || apiKey.startsWith("sk-...")) {
    return NextResponse.json(
      { error: "ALU.IA no está configurada. Pide a un administrador que configure la API key de OpenAI en el panel de administración." },
      { status: 503 }
    );
  }

  try {
    // ── 1. Build system prompt ─────────────────────────────────────────────

    let systemPromptWithContext = SYSTEM_PROMPT;
    const isOnboarding = context === "onboarding";

    if (isOnboarding) {
      systemPromptWithContext = ONBOARDING_SYSTEM_PROMPT.replace(
        "{onboardingContext}",
        onboardingContext || "Sin datos disponibles"
      );
    } else if (context === "dashboard" && stats && Object.keys(stats).length > 0) {
      // 1b. If the client sends dashboard context + stats, embed them directly
      //     (no extra DB round-trip needed — the frontend already has these values).
      systemPromptWithContext += buildDashboardContextBlock(stats);
    } else {
      // 1c. Fall back to fetching real-time context from DB (original behavior)
      try {
        const semanaAtras = new Date();
        semanaAtras.setDate(semanaAtras.getDate() - 7);
        const fechaHoy = new Date().toLocaleDateString("es-PE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        const [
          totalLeads,
          leadsEstaSemana,
          totalOpportunities,
          ingresosAggregate,
          alertasSinLeer,
        ] = await Promise.all([
          prisma.lead.count(),
          prisma.lead.count({ where: { createdAt: { gte: semanaAtras } } }),
          prisma.opportunity.count(),
          prisma.opportunity.aggregate({
            _sum: { value: true },
            where: { stage: "cerrado_ganado" },
          }),
          prisma.alert.count({ where: { read: false } }),
        ]);

        const ingresosCerrados = ingresosAggregate._sum.value ?? 0;

        const contextBlock =
          `Datos actuales del negocio (al ${fechaHoy}):\n` +
          `- Total leads: ${totalLeads} | Nuevos esta semana: ${leadsEstaSemana}\n` +
          `- Oportunidades en pipeline: ${totalOpportunities}\n` +
          `- Ingresos cerrados: S/ ${ingresosCerrados.toLocaleString("es-PE", { minimumFractionDigits: 2 })}\n` +
          `- Alertas sin atender: ${alertasSinLeer}`;

        systemPromptWithContext += "\n\n## Contexto actual del negocio\n" + contextBlock;
      } catch {
        // If context fetch fails, continue with base prompt
      }
    }

    // 1d. Detect widget configuration intent and add suggestion block
    if (!isOnboarding && detectsWidgetIntent(message)) {
      systemPromptWithContext += WIDGET_SUGGESTION_BLOCK;
    }

    // ── 2. Fetch conversation history ──────────────────────────────────────

    const recentHistory = await prisma.aluMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const conversationMessages: any[] = [
      { role: "system", content: systemPromptWithContext },
      ...recentHistory.reverse().map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    // ── 3. Persist user message ────────────────────────────────────────────

    await prisma.aluMessage.create({ data: { userId, role: "user", content: message } });

    // ── 4. Stream response, ejecutando tool calls si el modelo las pide ────

    const encoder = new TextEncoder();
    const tools = isOnboarding ? undefined : META_TOOLS;

    const stream = new ReadableStream({
      async start(controller) {
        const sendDelta = (text: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`)
          );
        };

        let fullContent = "";
        const MAX_ROUNDS = 3;

        try {
          for (let round = 0; round < MAX_ROUNDS; round++) {
            const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: conversationMessages,
                ...(tools ? { tools, tool_choice: "auto" } : {}),
                stream: true,
                temperature: 0.7,
                max_tokens: 500,
              }),
            });

            if (!openaiRes.ok || !openaiRes.body) {
              throw new Error(`OpenAI respondió ${openaiRes.status}`);
            }

            const { content, toolCalls, finishReason } = await drainOpenAIStream(openaiRes, (delta) => {
              fullContent += delta;
              sendDelta(delta);
            });

            if (finishReason !== "tool_calls" || toolCalls.length === 0) {
              break; // Respuesta final ya transmitida al usuario.
            }

            // El modelo pidió usar una o más herramientas: ejecutarlas y
            // darle el resultado de vuelta para que formule la respuesta final.
            conversationMessages.push({
              role: "assistant",
              content: content || null,
              tool_calls: toolCalls.map((tc) => ({
                id: tc.id,
                type: "function",
                function: { name: tc.name, arguments: tc.arguments },
              })),
            });

            for (const tc of toolCalls) {
              let args: Record<string, unknown> = {};
              try { args = JSON.parse(tc.arguments || "{}"); } catch { /* args vacíos */ }
              const result = await executeMetaTool(tc.name, args, companyId);
              conversationMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                content: JSON.stringify(result),
              });
            }
            // Continúa al siguiente round con el resultado ya en el contexto.
          }
        } catch (err) {
          console.error("[alu-ia] Error en streaming:", err);
          if (!fullContent) {
            sendDelta("Ups, tuve un problema generando la respuesta. Intenta de nuevo.");
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();

        if (fullContent) {
          prisma.aluMessage
            .create({ data: { userId, role: "assistant", content: fullContent } })
            .catch((err) => console.error("[alu-ia] No se pudo guardar la respuesta:", err));
        }
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return NextResponse.json({ error: "OpenAI API error" }, { status: 500 });
  }
}
