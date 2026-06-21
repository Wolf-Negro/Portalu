import OpenAI, { toFile, type ClientOptions } from "openai";
import type { ChatCompletionMessageParam, ChatCompletionContentPart } from "openai/resources/chat/completions";
import pdfParse from "pdf-parse";
import { getMessages, getAISettings, getAppConfig } from "./bot-db";
import { SYSTEM_PROMPT } from "./bot-system-prompt";

const isOpenRouter = Boolean(process.env.OPENROUTER_API_KEY);

const openaiRouter = isOpenRouter
  ? new OpenAI({
      apiKey:   process.env.OPENROUTER_API_KEY,
      baseURL:  "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.SITE_URL || "http://localhost:3000",
        "X-Title":      "Portalu Bot",
      },
    } as ClientOptions)
  : null;

const AI_MODEL =
  process.env.AI_MODEL ||
  (isOpenRouter ? "openai/gpt-4o-mini" : "gpt-4o-mini");

function resolveClient(dbApiKey: string | null): OpenAI | null {
  if (isOpenRouter) return openaiRouter;
  const key = dbApiKey?.trim();
  if (!key) return null;
  return new OpenAI({ apiKey: key });
}

export async function generateReply(
  companyId: string, conversationId: number | string
): Promise<{ reply: string; scoring: number } | null> {
  try {
    const history = await getMessages(companyId, String(conversationId)) || [];

    const formattedHistory: ChatCompletionMessageParam[] = history.map((msg: any) => ({
      role: (msg.from_me === 1 ? "assistant" : "user") as "assistant" | "user",
      content: extractTextForAI(msg.text || ""),
    }));

    const appCfg = await getAppConfig(companyId);
    const client = resolveClient(appCfg.openai_api_key);

    if (!client) {
      console.log("[ai] Sin API Key configurada en app_config. Bot inactivo.");
      return null;
    }

    const basePrompt = appCfg.sistema_prompt?.trim() || SYSTEM_PROMPT;
    const aiSettings = await getAISettings(companyId);

    const STYLE_RULE =
      "REGLA CRÍTICA DE ESTILO: Escribe SIEMPRE como una persona real en un chat " +
      "de WhatsApp: claro, directo y conversacional. Está totalmente PROHIBIDO usar " +
      "párrafos largos o estructurados tipo comunicado de prensa. Divide tus " +
      "respuestas en mensajes cortos de máximo 1 o 2 líneas por párrafo. " +
      "Sé empático, fluido y directo al grano.";

    const sections: string[] = [basePrompt, STYLE_RULE];

    if (appCfg.reglas_precalificar?.trim()) {
      sections.push(
        `=========================================\n` +
        `REGLA DE PRECALIFICACIÓN (COLUMNA 2):\n` +
        `${appCfg.reglas_precalificar.trim()}\n\n` +
        `ACCIÓN OBLIGATORIA: En el momento exacto en que el lead cumpla esta regla,\n` +
        `incluye el texto [ACTION:QUALIFY] al final del campo reply, en ese mismo\n` +
        `mensaje. No lo postergues al siguiente turno.\n` +
        `=========================================`
      );
    }

    if (appCfg.reglas_derivar?.trim()) {
      sections.push(
        `=========================================\n` +
        `REGLA DE DERIVACIÓN A ASESOR (COLUMNA 3):\n` +
        `${appCfg.reglas_derivar.trim()}\n\n` +
        `ACCIÓN OBLIGATORIA: En el momento exacto en que el lead cumpla esta regla,\n` +
        `incluye el texto [ACTION:DERIVE] al final del campo reply, en ese mismo\n` +
        `mensaje. No lo postergues al siguiente turno.\n` +
        `=========================================`
      );
    }

    if (aiSettings?.business_context?.trim()) {
      sections.push(`CONTEXTO ADICIONAL DEL NEGOCIO:\n${aiSettings.business_context.trim()}`);
    }
    if (aiSettings?.promotions?.trim()) {
      sections.push(`PROMOCIONES Y OFERTAS ACTIVAS:\n${aiSettings.promotions.trim()}`);
    }
    if (aiSettings?.handoff_rules?.trim()) {
      sections.push(`REGLAS DE TRANSFERENCIA HUMANA:\n${aiSettings.handoff_rules.trim()}`);
    }

    const SEP          = "\n\n=========================================\n";
    const systemContent = sections.join(SEP);

    const jsonInstruction =
      "\n\n=========================================\n" +
      "FORMATO DE RESPUESTA — OBLIGATORIO, NO NEGOCIABLE:\n" +
      "Responde ÚNICAMENTE con este JSON exacto (sin texto fuera de él):\n" +
      `{"reply": "<tu respuesta + tags si aplican>", "scoring": "<carita>"}\n\n` +
      '"scoring" = calidad del lead. USA EXACTAMENTE uno de estos tres valores:\n' +
      '  "triste" → bajo interés, no califica o da señales negativas\n' +
      '  "seria"  → interés moderado, sigue evaluando\n' +
      '  "feliz"  → alto interés, listo para comprar o ya dejó sus datos\n\n' +
      "TAGS DE PIPELINE — OBLIGATORIOS DENTRO DEL CAMPO reply SI SE CUMPLEN LAS REGLAS:\n" +
      "  • [ACTION:QUALIFY]            → el lead cumplió la regla de precalificación\n" +
      "  • [ACTION:DERIVE]             → el lead cumplió la regla de derivación\n" +
      "  • [ACTION:PAYMENT_CONFIRMED]  → el lead confirmó el pago\n" +
      "NUNCA los omitas si las reglas se cumplen. Ponlos siempre AL FINAL del texto dentro de reply.";

    const finalSystem = systemContent.trim() + jsonInstruction;

    const response = await client.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { role: "system", content: finalSystem },
        ...formattedHistory,
      ],
      temperature: 0.5,
    });

    const raw     = response.choices[0].message.content || "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    const caritaToScore = (val: unknown): number => {
      const s = String(val ?? "").toLowerCase().trim();
      if (s === "feliz")  return 100;
      if (s === "seria")  return 60;
      if (s === "triste") return 30;
      const n = Number(val);
      return isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : 30;
    };

    let reply: string;
    let scoring: number;
    try {
      const parsed = JSON.parse(cleaned);
      reply   = String(parsed.reply ?? "").trim();
      scoring = caritaToScore(parsed.scoring);
      if (!reply) throw new Error("reply vacío");
    } catch {
      const replyMatch = cleaned.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
      const scoringRaw = cleaned.match(/"scoring"\s*:\s*"?([^",}\s\]]+)"?/)?.[1];

      if (replyMatch?.[1]) {
        reply   = replyMatch[1]
          .replace(/\\n/g, "\n")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
          .trim();
        scoring = caritaToScore(scoringRaw);
        console.warn(`[ai] JSON malformado — reply recuperado vía regex (convId: ${conversationId})`);
      } else {
        reply   = cleaned || raw.trim();
        scoring = 30;
        console.warn(`[ai] JSON malformado sin recuperación — texto crudo (convId: ${conversationId})`);
      }
    }
    if (!reply) return null;

    for (const [key, tag] of [["QUALIFY", "[ACTION:QUALIFY]"], ["DERIVE", "[ACTION:DERIVE]"]] as [string, string][]) {
      const re = new RegExp(`\\[ACTION:${key}\\]`, "i");
      if (!re.test(reply) && re.test(cleaned)) {
        reply += ` ${tag}`;
        console.warn(`[ai] Tag ${tag} rescatado de fuera del campo reply (convId: ${conversationId})`);
      }
    }

    return { reply, scoring };
  } catch (error) {
    console.error(`[ai] Error generando respuesta:`, error);
    return null;
  }
}

function extractTextForAI(text: string): string {
  const withDesc = text.match(/^\[img:[^\]|]+\|([^\]]*)\]/);
  if (withDesc) return `[Imagen recibida] ${withDesc[1]}`;
  if (/^\[img:/.test(text)) return "[Imagen recibida sin descripción]";
  if (text === "[🎵 Audio]")     return "[Mensaje de voz recibido — transcripción no disponible]";
  if (text === "[🎬 Video]")     return "[Video recibido]";
  if (text === "[📄 Documento]") return "[Documento recibido — contenido no extraíble]";
  if (text === "[✨ Sticker]")   return "[Sticker recibido]";
  return text;
}

export async function analyzeImage(
  companyId: string,
  base64: string,
  mimeType: string
): Promise<string | null> {
  try {
    const appCfg = await getAppConfig(companyId);
    const client = resolveClient(appCfg.openai_api_key);
    if (!client) return null;

    const content: ChatCompletionContentPart[] = [
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
      {
        type: "text",
        text: "Describe detalladamente el contenido de esta imagen. Si es un comprobante de pago, extrae monto, destinatario, fecha y método de pago. Si es otra cosa, describe qué se ve.",
      },
    ];

    const response = await client.chat.completions.create({
      model:       AI_MODEL,
      max_tokens:  400,
      temperature: 0.1,
      messages:    [{ role: "user", content }],
    });

    return response.choices[0].message.content?.trim() || null;
  } catch (err) {
    console.error("[vision] Error analizando imagen:", err);
    return null;
  }
}

export async function transcribeAudio(
  companyId: string,
  buffer: Buffer,
  mimeType: string
): Promise<string | null> {
  try {
    const appCfg = await getAppConfig(companyId);
    const client = resolveClient(appCfg.openai_api_key);
    if (!client) return null;
    const ext  = mimeType.split("/")[1]?.split(";")[0] || "ogg";
    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType });
    const result = await client.audio.transcriptions.create({ file, model: "whisper-1" });
    return result.text?.trim() || null;
  } catch (err) {
    console.error("[whisper] Error transcribiendo audio:", err);
    return null;
  }
}

export async function extractPdfText(buffer: Buffer): Promise<string | null> {
  try {
    const result = await pdfParse(buffer);
    const text   = result.text?.trim();
    if (!text) return null;
    const LIMIT = 4000;
    if (text.length <= LIMIT) return text;
    return text.slice(0, LIMIT) + `\n[...documento truncado — ${LIMIT} de ${text.length} caracteres extraídos]`;
  } catch (err) {
    console.error("[pdf] Error extrayendo texto:", err);
    return null;
  }
}

export async function generateAiSummary(companyId: string, conversationId: string): Promise<string | null> {
  try {
    const history = await getMessages(companyId, conversationId) || [];
    if (history.length === 0) return null;

    const appCfg = await getAppConfig(companyId);
    const client = resolveClient(appCfg.openai_api_key);
    if (!client) return null;

    const chatText = (history as any[])
      .filter((m) => m.text)
      .map((m) => `${m.from_me ? "Bot" : "Lead"}: ${m.text}`)
      .join("\n");

    const response = await client.chat.completions.create({
      model:       AI_MODEL,
      temperature: 0.2,
      max_tokens:  80,
      messages: [
        {
          role:    "system",
          content: "Eres un asistente de ventas. Escribe un resumen del chat en máximo 150 caracteres. Incluye: qué busca el lead, presupuesto o acuerdos clave. Texto libre, directo, sin etiquetas ni formato.",
        },
        { role: "user", content: `Historial:\n${chatText}` },
      ],
    });

    const summary = response.choices[0].message.content?.trim() || null;
    return summary ? summary.slice(0, 150) : null;
  } catch (err) {
    console.error("[ai] Error generando resumen ejecutivo:", err);
    return null;
  }
}
