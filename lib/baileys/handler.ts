import fs from "fs";
import path from "path";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import {
  getOrCreateConversation,
  insertMessage,
  getConversationById,
  setConversationMode,
  addConvTag,
  removeConvTag,
  setConvTags,
  getConvTags,
  getLastOutboundMessage,
  isMetaLeadSent,
  markMetaLeadSent,
  emitEvent,
  updateLeadScoring,
  enqueueOutbox,
  getAppConfig,
} from "../bot-db";
import { generateReply, analyzeImage, transcribeAudio, extractPdfText } from "../bot-openai";
import prisma from "../prisma";
import { enviarEventoMetaCAPI } from "../bot-meta-capi";
import { enqueueMessage } from "../bot-message-queue";
import { broadcastWs } from "../bot-ws-server";

/** Crea un registro Lead en el CRM cuando llega un nuevo contacto de WhatsApp,
 *  para que aparezca en el módulo Leads de Portalu. Idempotente: si ya existe
 *  un Lead con ese teléfono para la empresa, no crea duplicado. */
async function ensureCrmLead(companyId: string, remoteJid: string, displayName: string): Promise<void> {
  try {
    const isLid    = remoteJid.endsWith("@lid");
    const rawPhone = remoteJid.split("@")[0];
    const phone    = isLid ? null : rawPhone;

    const exists = phone
      ? await prisma.lead.findFirst({ where: { companyId, phone } })
      : null;
    if (!exists) {
      await prisma.lead.create({
        data: {
          name: displayName || phone || "Contacto WhatsApp",
          phone: phone ?? undefined,
          origin: "whatsapp",
          status: "nuevo",
          companyId,
        },
      });
    }
  } catch (err) {
    console.error("[bot] Error creando Lead CRM desde WhatsApp:", err);
  }
}

const ACTION_QUALIFY_REGEX            = /\[ACTION:QUALIFY\]/i;
const ACTION_DERIVE_REGEX             = /\[ACTION:DERIVE\]/i;
const ACTION_PAYMENT_CONFIRMED_REGEX  = /\[ACTION:PAYMENT_CONFIRMED\]/i;

const S380_OFFER_REGEX = /valor de S\/380|S\/380/i;

const AFIRMATIVO_REGEX =
  /\bsí\b|\bclaro\b|\bpor supuesto\b|\bme interesa\b|\bquiero\b|\bme gustar[íi]a\b|\bagendar\b|\breservar\b|\badelante\b|\bdale\b|\bde acuerdo\b|\bcon gusto\b|\bcuenta conmigo\b|\bme apunto\b/i;

const NO_CALIFICA_REGEX =
  /etapa inicial|más adelante feliz de ayudarte/i;

function buildDerivacionRegex(nombreAsesor: string | null): RegExp | null {
  const name = nombreAsesor?.trim();
  if (!name) return null;
  try {
    return new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  } catch {
    return null;
  }
}

const CORPORATE_INTRO_REGEX =
  /(?:primero te (?:cuento|hablo)(?: sobre nosotros)?[^.!?]*[.!?]|somos una? (?:consultora|empresa|agencia|compañía)[^.!?]*[.!?])\s*/gi;

function groupSentences(sentences: string[]): string[] {
  const groups: string[] = [];
  let current: string[] = [];
  for (const s of sentences) {
    current.push(s);
    if (s.trimEnd().endsWith("?") || current.length >= 2) {
      groups.push(current.join(" ").trim());
      current = [];
    }
  }
  if (current.length) groups.push(current.join(" ").trim());
  return groups.filter(Boolean);
}

function cleanOutputMessage(text: string): string {
  let out = text.replace(CORPORATE_INTRO_REGEX, "").trim();
  out = out.replace(/\n{3,}/g, "\n\n");
  const result: string[] = [];

  for (const block of out.split(/\n\n+/)) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 120) { result.push(trimmed); continue; }

    const sentences = trimmed
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (sentences.length <= 2) result.push(trimmed);
    else result.push(...groupSentences(sentences));
  }

  return result.join("\n\n").replace(/[ \t]{2,}/g, " ").trim();
}

async function getDebounceMs(companyId: string): Promise<number> {
  try {
    const ms = (await getAppConfig(companyId)).bot_delay_ms;
    return isFinite(ms) && ms >= 500 ? ms : 2500;
  } catch {
    return 2500;
  }
}

interface MsgBuffer {
  companyId: string;
  convId:    string;
  phone:     string;
  remoteJid: string;
  wamid:     string | undefined;
  pushName:  string | undefined;
  convoName: string | undefined;
  texts:     string[];
  timer:     ReturnType<typeof setTimeout>;
}

const pendingBuffers = new Map<string, MsgBuffer>();

async function processAIReply(buf: Omit<MsgBuffer, "timer">) {
  const { companyId, convId, phone, remoteJid, wamid, pushName, convoName, texts } = buf;
  try {
    const freshConvo = await getConversationById(companyId, convId);
    if (!freshConvo || freshConvo.mode !== "AI") return;

    const combinedText = texts.join("\n");
    const appCfg       = await getAppConfig(companyId);
    const currentTags  = await getConvTags(companyId, convId);

    if (
      !appCfg.reglas_precalificar?.trim() &&
      currentTags.includes("REGISTRO") &&
      !currentTags.includes("PRECALIFICADO")
    ) {
      const lastOutbound = await getLastOutboundMessage(companyId, convId);
      if (lastOutbound && S380_OFFER_REGEX.test(lastOutbound) && AFIRMATIVO_REGEX.test(combinedText)) {
        await removeConvTag(companyId, convId, "REGISTRO");
        await addConvTag(companyId, convId, "PRECALIFICADO");
        await emitEvent(companyId, "tag:update", { conversationId: convId, tags: ["PRECALIFICADO"] });
        broadcastWs(companyId, "chat:updated", { conversationId: convId, tag: "PRECALIFICADO" });
      }
    }

    let reply   = "";
    let scoring = 0;
    try {
      const result = await generateReply(companyId, convId);
      if (!result) return;
      reply   = result.reply;
      scoring = result.scoring;
    } catch (parseErr) {
      try {
        const raw   = String(parseErr);
        const match = raw.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (!match) { console.error("[handler] JSON roto sin reply rescatable:", parseErr); return; }
        reply   = match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
        scoring = 0;
      } catch {
        console.error("[handler] No se pudo rescatar reply:", parseErr);
        return;
      }
    }

    const tagsAfterPreReply = await getConvTags(companyId, convId);
    const DERIVACION_REGEX  = buildDerivacionRegex(appCfg.nombre_asesor);

    if (NO_CALIFICA_REGEX.test(reply)) {
      const stageBeforeDrop = tagsAfterPreReply.find((t) =>
        t === "PRECALIFICADO" || t === "REGISTRO"
      ) ?? "REGISTRO";
      await setConvTags(companyId, convId, [stageBeforeDrop, "NO_CALIFICA"]);
      await setConversationMode(companyId, convId, "HUMAN");
      await emitEvent(companyId, "tag:update",  { conversationId: convId, tags: ["NO_CALIFICA"] });
      await emitEvent(companyId, "mode:update", { conversationId: convId, mode: "HUMAN" });
      broadcastWs(companyId, "chat:updated", { conversationId: convId, mode: "HUMAN", tag: "NO_CALIFICA" });
    } else if (
      ACTION_PAYMENT_CONFIRMED_REGEX.test(reply) &&
      !tagsAfterPreReply.includes("PAGO_DIAGNOSTICO")
    ) {
      await addConvTag(companyId, convId, "PAGO_DIAGNOSTICO");
      await setConversationMode(companyId, convId, "HUMAN");
      await emitEvent(companyId, "tag:update",  { conversationId: convId, tags: ["PAGO_DIAGNOSTICO"] });
      await emitEvent(companyId, "mode:update", { conversationId: convId, mode: "HUMAN" });
      broadcastWs(companyId, "chat:updated", { conversationId: convId, mode: "HUMAN", tag: "PAGO_DIAGNOSTICO" });

      const valor = appCfg.valor_conversion ?? 380;
      enviarEventoMetaCAPI(companyId, "Purchase", { phone, value: valor }).catch((err) =>
        console.error("[handler] CAPI Purchase error:", err)
      );
    } else if (
      appCfg.reglas_precalificar?.trim() &&
      ACTION_QUALIFY_REGEX.test(reply) &&
      tagsAfterPreReply.includes("REGISTRO") &&
      !tagsAfterPreReply.includes("PRECALIFICADO")
    ) {
      await removeConvTag(companyId, convId, "REGISTRO");
      await addConvTag(companyId, convId, "PRECALIFICADO");
      await emitEvent(companyId, "tag:update", { conversationId: convId, tags: ["PRECALIFICADO"] });
      broadcastWs(companyId, "chat:updated", { conversationId: convId, tag: "PRECALIFICADO" });
    } else if (
      ACTION_DERIVE_REGEX.test(reply) ||
      (DERIVACION_REGEX !== null && DERIVACION_REGEX.test(reply))
    ) {
      if (!tagsAfterPreReply.includes("PRECALIFICADO")) {
        await removeConvTag(companyId, convId, "REGISTRO");
        await addConvTag(companyId, convId, "PRECALIFICADO");
        await emitEvent(companyId, "tag:update", { conversationId: convId, tags: ["PRECALIFICADO"] });
        broadcastWs(companyId, "chat:updated", { conversationId: convId, tag: "PRECALIFICADO" });
      }
      await removeConvTag(companyId, convId, "PRECALIFICADO");
      await addConvTag(companyId, convId, "ATENCION_COMERCIAL");
      await setConversationMode(companyId, convId, "DERIVED");
      await emitEvent(companyId, "mode:update", { conversationId: convId, mode: "DERIVED" });
      await emitEvent(companyId, "tag:update",  { conversationId: convId, tags: ["ATENCION_COMERCIAL"] });
      broadcastWs(companyId, "chat:updated", { conversationId: convId, mode: "DERIVED", tag: "ATENCION_COMERCIAL" });

      if (appCfg.whatsapp_asesor?.trim()) {
        try {
          const asesorPhone = appCfg.whatsapp_asesor.trim().replace(/\D/g, "");
          const leadName    = pushName || convoName || phone;
          const convRow     = await getConversationById(companyId, convId) as any;
          const summary     = convRow?.ai_summary ?? null;
          const isLid       = remoteJid.endsWith("@lid");
          const notifMsg    = [
            `✅ *Nuevo Lead*`,
            `👤 *Nombre:* ${leadName}`,
            !isLid ? `📱 *Teléfono:* +${phone}` : null,
            summary ? `📋 *Resumen:* ${summary}` : null,
          ].filter(Boolean).join("\n");
          await enqueueOutbox(companyId, convId, asesorPhone, notifMsg);
        } catch (err) {
          console.error("[pipeline] Error encolando notificación:", err);
        }
      }

      if (!await isMetaLeadSent(companyId, convId)) {
        await markMetaLeadSent(companyId, convId);
        enviarEventoMetaCAPI(companyId, "Lead", { phone, wamid }).catch((err) =>
          console.error("[handler] CAPI Lead error:", err)
        );
      }
    }

    await updateLeadScoring(companyId, convId, scoring);
    const cleanReply = cleanOutputMessage(
      reply.replace(/\[ACTION:[^\]]*\]/gi, "").trim()
    );
    await insertMessage(companyId, convId, "assistant", cleanReply);

    await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
    broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
    enqueueMessage(companyId, remoteJid, cleanReply);

  } catch (error) {
    console.error("[handler] Error en processAIReply:", error);
  }
}

const MAX_PENDING_BUFFERS = 500;
const MAX_BUFFER_TEXTS    = 30;

function bufferAIMessage(params: {
  companyId: string;
  remoteJid: string;
  convId:    string;
  phone:     string;
  wamid:     string | undefined;
  pushName:  string | undefined;
  convoName: string | undefined;
  text:      string;
  debounceMs: number;
}) {
  const { companyId, remoteJid, convId, phone, wamid, pushName, convoName, text, debounceMs } = params;
  const existing = pendingBuffers.get(remoteJid);

  if (existing) {
    clearTimeout(existing.timer);
    existing.texts.push(text);
    existing.convId = convId;
    if (existing.texts.length >= MAX_BUFFER_TEXTS) {
      pendingBuffers.delete(remoteJid);
      processAIReply(existing);
      return;
    }
    existing.timer = setTimeout(() => { pendingBuffers.delete(remoteJid); processAIReply(existing); }, debounceMs);
    return;
  }

  if (pendingBuffers.size >= MAX_PENDING_BUFFERS) {
    const oldestKey = pendingBuffers.keys().next().value;
    if (oldestKey) {
      const oldest = pendingBuffers.get(oldestKey)!;
      clearTimeout(oldest.timer);
      pendingBuffers.delete(oldestKey);
      processAIReply(oldest);
    }
  }

  const buf: MsgBuffer = { companyId, convId, phone, remoteJid, wamid, pushName, convoName, texts: [text], timer: null as any };
  buf.timer = setTimeout(() => { pendingBuffers.delete(remoteJid); processAIReply(buf); }, debounceMs);
  pendingBuffers.set(remoteJid, buf);
}

async function notifyAsesor(
  companyId:  string,
  convId:     string,
  phone:      string,
  remoteJid:  string,
  msg:        any,
  convo:      any,
  mediaLabel: string
) {
  const appCfg = await getAppConfig(companyId);
  if (!appCfg.whatsapp_asesor?.trim()) return;
  try {
    const asesorPhone = appCfg.whatsapp_asesor.trim().replace(/\D/g, "");
    const leadName    = msg.pushName || convo.name || phone;
    const isLid       = remoteJid.endsWith("@lid");
    const label       = mediaLabel.replace(/\[|\]/g, "");
    const notifMsg    = [
      `📎 *Media de Lead*`,
      `👤 *Nombre:* ${leadName}`,
      !isLid ? `📱 *Teléfono:* +${phone}` : null,
      `📩 *Tipo:* ${label}`,
      `ℹ️ El bot se pausó. Revisa el chat en la plataforma.`,
    ].filter(Boolean).join("\n");
    await enqueueOutbox(companyId, convId, asesorPhone, notifMsg);
  } catch (err) {
    console.error("[media] Error notificando a asesora:", err);
  }
}

const MEDIA_TYPES = {
  imageMessage:    { placeholder: "[📷 Imagen]",     ack: "Gracias, recibí tu imagen 📷. Un asesor la revisará pronto."          },
  audioMessage:    { placeholder: "[🎵 Audio]",      ack: "Gracias, recibí tu mensaje de voz 🎵. Un asesor lo escuchará pronto." },
  videoMessage:    { placeholder: "[🎬 Video]",      ack: "Gracias, recibí tu video 🎬. Un asesor lo revisará pronto."           },
  documentMessage: { placeholder: "[📄 Documento]",  ack: "Gracias, recibí tu documento 📄. Un asesor lo revisará pronto."       },
  stickerMessage:  { placeholder: "[✨ Sticker]",    ack: ""                                                                      },
} as const;

type MediaKey = keyof typeof MEDIA_TYPES;

function detectMediaType(message: any): MediaKey | null {
  if (!message) return null;
  for (const key of Object.keys(MEDIA_TYPES) as MediaKey[]) {
    if (message[key]) return key;
  }
  return null;
}

export const handleIncomingMessages = async (sock: any, m: any, companyId: string) => {
  if (m.type !== "notify") return;

  for (const msg of m.messages) {
    try {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;

      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid.includes("@g.us") || remoteJid === "status@broadcast") continue;

      const text      = msg.message?.conversation || msg.message?.extendedTextMessage?.text;
      const mediaType = detectMediaType(msg.message);

      if (!text && mediaType) {
        const phone  = remoteJid.split("@")[0];
        const convo  = await getOrCreateConversation(companyId, phone, msg.pushName || phone, remoteJid);
        const convId = String((convo as any).id);
        await addConvTag(companyId, convId, "REGISTRO");
        await ensureCrmLead(companyId, remoteJid, msg.pushName || (convo as any).name || phone);

        if (mediaType === "imageMessage") {
          let msgText: string = MEDIA_TYPES.imageMessage.placeholder;
          let imageOk = false;

          try {
            const noop   = () => {};
            const buffer = await downloadMediaMessage(msg, "buffer", {}, {
              logger: { info: noop, error: noop, warn: noop, debug: noop, trace: noop, child: () => ({}) } as any,
              reuploadRequest: sock.updateMediaMessage,
            });
            const mimeType  = (msg.message?.imageMessage?.mimetype as string | undefined) || "image/jpeg";
            const ext       = mimeType.split("/")[1]?.split(";")[0] || "jpg";
            const filename  = `${Date.now()}_${convId}.${ext}`;
            const imagesDir = path.join(process.cwd(), "data", "media", "images");
            fs.mkdirSync(imagesDir, { recursive: true });
            fs.writeFileSync(path.join(imagesDir, filename), buffer as Buffer);
            imageOk = true;

            const base64      = (buffer as Buffer).toString("base64");
            const description = await analyzeImage(companyId, base64, mimeType);
            msgText = description ? `[img:${filename}|${description}]` : `[img:${filename}]`;
          } catch (downloadErr) {
            console.error("[vision] Error descargando imagen:", downloadErr);
          }

          await insertMessage(companyId, (convo as any).id, "user", msgText);
          await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "user" });
          broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "user" });

          const freshConvoImg = await getConversationById(companyId, convId);

          if (!imageOk) {
            const { ack } = MEDIA_TYPES.imageMessage;
            if (freshConvoImg?.mode === "AI") {
              if (ack) {
                await insertMessage(companyId, convId, "assistant", ack);
                enqueueMessage(companyId, remoteJid, ack);
                await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
                broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
              }
              await setConversationMode(companyId, convId, "HUMAN");
              await emitEvent(companyId, "mode:update", { conversationId: convId, mode: "HUMAN" });
              broadcastWs(companyId, "chat:updated", { conversationId: convId, mode: "HUMAN" });
              await notifyAsesor(companyId, convId, phone, remoteJid, msg, convo, "[📷 Imagen]");
            }
          } else if (freshConvoImg?.mode === "AI") {
            const wamid      = (msg.key?.id as string | undefined) ?? undefined;
            const bufText    = msgText.match(/^\[img:[^\]|]+\|([^\]]*)\]/)?.[1] ?? "[imagen]";
            const debounceMs = await getDebounceMs(companyId);
            bufferAIMessage({
              companyId, remoteJid, convId, phone, wamid,
              pushName: msg.pushName, convoName: (convo as any).name,
              text: bufText, debounceMs,
            });
          }
          continue;
        }

        if (mediaType === "audioMessage") {
          let downloadOk = false;
          let msgText: string = MEDIA_TYPES.audioMessage.placeholder;

          try {
            const noop   = () => {};
            const buffer = await downloadMediaMessage(msg, "buffer", {}, {
              logger: { info: noop, error: noop, warn: noop, debug: noop, trace: noop, child: () => ({}) } as any,
              reuploadRequest: sock.updateMediaMessage,
            });
            downloadOk = true;
            const mimeType      = (msg.message?.audioMessage?.mimetype as string | undefined) || "audio/ogg";
            const transcription = await transcribeAudio(companyId, buffer as Buffer, mimeType);
            if (transcription) msgText = transcription;
          } catch (downloadErr) {
            console.error("[whisper] Error descargando audio:", downloadErr);
          }

          await insertMessage(companyId, (convo as any).id, "user", msgText);
          await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "user" });
          broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "user" });

          const freshConvoAudio = await getConversationById(companyId, convId);

          if (!downloadOk) {
            const { ack } = MEDIA_TYPES.audioMessage;
            if (freshConvoAudio?.mode === "AI") {
              if (ack) {
                await insertMessage(companyId, convId, "assistant", ack);
                enqueueMessage(companyId, remoteJid, ack);
                await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
                broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
              }
              await setConversationMode(companyId, convId, "HUMAN");
              await emitEvent(companyId, "mode:update", { conversationId: convId, mode: "HUMAN" });
              broadcastWs(companyId, "chat:updated", { conversationId: convId, mode: "HUMAN" });
              await notifyAsesor(companyId, convId, phone, remoteJid, msg, convo, "[🎵 Audio]");
            }
          } else if (freshConvoAudio?.mode === "AI") {
            const wamid      = (msg.key?.id as string | undefined) ?? undefined;
            const bufText    = msgText !== MEDIA_TYPES.audioMessage.placeholder ? msgText : "[voz recibida]";
            const debounceMs = await getDebounceMs(companyId);
            bufferAIMessage({
              companyId, remoteJid, convId, phone, wamid,
              pushName: msg.pushName, convoName: (convo as any).name,
              text: bufText, debounceMs,
            });
          }
          continue;
        }

        if (mediaType === "documentMessage") {
          let downloadOk = false;
          let msgText: string = MEDIA_TYPES.documentMessage.placeholder;
          const docMime = (msg.message?.documentMessage?.mimetype as string | undefined) || "";
          const isPdf   = docMime.toLowerCase().includes("pdf");

          if (!isPdf) {
            downloadOk = true;
          } else {
            try {
              const noop   = () => {};
              const buffer = await downloadMediaMessage(msg, "buffer", {}, {
                logger: { info: noop, error: noop, warn: noop, debug: noop, trace: noop, child: () => ({}) } as any,
                reuploadRequest: sock.updateMediaMessage,
              });
              downloadOk = true;
              const pdfText = await extractPdfText(buffer as Buffer);
              if (pdfText) msgText = pdfText;
            } catch (downloadErr) {
              console.error("[pdf] Error descargando documento:", downloadErr);
            }
          }

          await insertMessage(companyId, (convo as any).id, "user", msgText);
          await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "user" });
          broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "user" });

          const freshConvoDoc = await getConversationById(companyId, convId);

          if (!downloadOk) {
            const { ack } = MEDIA_TYPES.documentMessage;
            if (freshConvoDoc?.mode === "AI") {
              if (ack) {
                await insertMessage(companyId, convId, "assistant", ack);
                enqueueMessage(companyId, remoteJid, ack);
                await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
                broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
              }
              await setConversationMode(companyId, convId, "HUMAN");
              await emitEvent(companyId, "mode:update", { conversationId: convId, mode: "HUMAN" });
              broadcastWs(companyId, "chat:updated", { conversationId: convId, mode: "HUMAN" });
              await notifyAsesor(companyId, convId, phone, remoteJid, msg, convo, "[📄 Documento]");
            }
          } else if (freshConvoDoc?.mode === "AI") {
            const wamid      = (msg.key?.id as string | undefined) ?? undefined;
            const bufText    = msgText !== MEDIA_TYPES.documentMessage.placeholder ? msgText : "[documento recibido]";
            const debounceMs = await getDebounceMs(companyId);
            bufferAIMessage({
              companyId, remoteJid, convId, phone, wamid,
              pushName: msg.pushName, convoName: (convo as any).name,
              text: bufText, debounceMs,
            });
          }
          continue;
        }

        const { placeholder, ack } = MEDIA_TYPES[mediaType];

        await insertMessage(companyId, (convo as any).id, "user", placeholder);
        await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "user" });
        broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "user" });

        const freshConvoMedia = await getConversationById(companyId, convId);
        const wasAI           = freshConvoMedia?.mode === "AI";

        if (wasAI && ack) {
          await insertMessage(companyId, convId, "assistant", ack);
          enqueueMessage(companyId, remoteJid, ack);
          await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
          broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "bot" });
        }

        if (wasAI) {
          await setConversationMode(companyId, convId, "HUMAN");
          await emitEvent(companyId, "mode:update", { conversationId: convId, mode: "HUMAN" });
          broadcastWs(companyId, "chat:updated", { conversationId: convId, mode: "HUMAN" });
          await notifyAsesor(companyId, convId, phone, remoteJid, msg, convo, placeholder);
        }

        continue;
      }

      if (!text) continue;

      const phone = remoteJid.split("@")[0];
      const wamid = (msg.key?.id as string | undefined) ?? undefined;
      const convo = await getOrCreateConversation(companyId, phone, msg.pushName || phone, remoteJid);
      await insertMessage(companyId, (convo as any).id, "user", text);
      const convId = String((convo as any).id);
      await addConvTag(companyId, convId, "REGISTRO");
      await ensureCrmLead(companyId, remoteJid, msg.pushName || (convo as any).name || phone);
      await emitEvent(companyId, "message:new", { conversationId: convId, phone, source: "user" });
      broadcastWs(companyId, "message:new", { conversationId: convId, phone, source: "user" });

      const freshConvo = await getConversationById(companyId, convId);
      if (!freshConvo || freshConvo.mode !== "AI") continue;

      const debounceMs = await getDebounceMs(companyId);
      bufferAIMessage({
        companyId, remoteJid, convId, phone, wamid,
        pushName: msg.pushName, convoName: (convo as any).name,
        text, debounceMs,
      });

    } catch (error) {
      console.error("[handler] Error:", error);
    }
  }
};

export function messageHandler(sock: any, companyId: string) {
  sock.ev.on("messages.upsert", (m: any) => handleIncomingMessages(sock, m, companyId));
}
