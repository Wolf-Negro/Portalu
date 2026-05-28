import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const SYSTEM_PROMPT = `Eres ALU.IA, el asistente de inteligencia artificial de PORTALU by Alucinando.
Eres un experto en marketing digital, ventas, publicidad en Meta Ads y estrategia de negocio.
Respondes siempre en español, de forma concisa, directa y orientada a acción.
Conoces el contexto del negocio del usuario: sus leads, campañas, conversiones y métricas.
Cuando des recomendaciones, sé específico y basado en datos.`;

export async function POST(req: NextRequest) {
  const { message, userId } = await req.json();
  if (!message || !userId) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.startsWith("sk-...")) {
    const mockResponse = `Hola! Soy ALU.IA. Para activar el chat con IA real, configura tu OPENAI_API_KEY en las variables de entorno.

Tu pregunta fue: "${message}"

Como demo, te digo: Los leads de Meta Ads convierten mejor cuando se responden en los primeros 5 minutos. ¿Quieres que analice tus métricas actuales?`;

    await prisma.aluMessage.createMany({
      data: [
        { userId, role: "user", content: message },
        { userId, role: "assistant", content: mockResponse },
      ],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const words = mockResponse.split(" ");
        let i = 0;
        const interval = setInterval(() => {
          if (i < words.length) {
            const chunk = `data: ${JSON.stringify({ choices: [{ delta: { content: words[i] + " " } }] })}\n\n`;
            controller.enqueue(encoder.encode(chunk));
            i++;
          } else {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            clearInterval(interval);
          }
        }, 60);
      },
    });

    return new Response(stream, {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  }

  try {
    // --- Fetch real business context ---
    let systemPromptWithContext = SYSTEM_PROMPT;
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

      systemPromptWithContext = SYSTEM_PROMPT + "\n\n## Contexto actual del negocio\n" + contextBlock;
    } catch {
      // If context fetch fails, continue without it
    }
    // --- End context fetch ---

    const recentHistory = await prisma.aluMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const messages = [
      { role: "system", content: systemPromptWithContext },
      ...recentHistory.reverse().map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    await prisma.aluMessage.create({ data: { userId, role: "user", content: message } });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-4o-mini", messages, stream: true, temperature: 0.7, max_tokens: 800 }),
    });

    let fullContent = "";
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const text = new TextDecoder().decode(chunk);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              const content = parsed.choices?.[0]?.delta?.content || "";
              fullContent += content;
            } catch {}
          }
        }
        controller.enqueue(chunk);
      },
      flush() {
        if (fullContent) {
          prisma.aluMessage.create({ data: { userId, role: "assistant", content: fullContent } }).catch(() => {});
        }
      },
    });

    return new Response(response.body!.pipeThrough(transformStream), {
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (error) {
    return NextResponse.json({ error: "OpenAI API error" }, { status: 500 });
  }
}
