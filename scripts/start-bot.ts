import "./env-loader";
import { startSessionFor, stopSessionFor, getSocketFor, listActiveSessions, autoStartActiveSessions } from "../lib/baileys/session-manager";
import { sql, initDB, resolveMediaJid, emitEvent } from "../lib/bot-db";
import { enqueueMessage, startMessageQueueWorker } from "../lib/bot-message-queue";
import { startWsServer, broadcastWs } from "../lib/bot-ws-server";
import fs             from "fs";
import path           from "path";
import { execFile } from "child_process";
import { promisify } from "util";
// @ts-ignore
import ffmpegPath     from "ffmpeg-static";

const execFileAsync = promisify(execFile);

async function main() {
  console.log("Iniciando Bot de WhatsApp...");

  await initDB();

  const WS_PORT = parseInt(process.env.WS_PORT ?? "3001", 10);
  startWsServer(WS_PORT);

  await autoStartActiveSessions();

  startMessageQueueWorker(
    getSocketFor,
    async (outboxId) => {
      await sql`UPDATE outbox SET sent = 1, status = 'SENT' WHERE id = ${outboxId}`;
    }
  );

  // Worker de Outbox: encola mensajes manuales cada 2 s — itera todas las
  // empresas con sesión activa, no asume una sola.
  setInterval(async () => {
    for (const companyId of listActiveSessions()) {
      const sock = getSocketFor(companyId);
      if (!sock) continue;

      const pendingMessages = await sql`SELECT * FROM outbox WHERE sent = 0 AND company_id = ${companyId}`;

      for (const msg of pendingMessages as any[]) {
        try {
          if (!msg.phone || !msg.content) continue;

          let targetJid = msg.phone.includes("@")
            ? msg.phone
            : `${msg.phone}@s.whatsapp.net`;

          if (!msg.phone.includes("@")) {
            try {
              const results = await sock.onWhatsApp(msg.phone);
              if (results && results.length > 0 && results[0].exists) {
                targetJid = results[0].jid;
                const [convo] = await sql`
                  SELECT id FROM conversations WHERE phone = ${msg.phone.split("@")[0]} AND company_id = ${companyId}
                `;
                if (convo) {
                  await sql`
                    UPDATE conversations SET remote_jid = ${targetJid} WHERE id = ${(convo as any).id}
                  `;
                }
                console.log(`[outbox:${companyId}] JID resuelto: ${targetJid}`);
              }
            } catch (err) {
              console.error(`[outbox:${companyId}] Error resolviendo JID para ${msg.phone}:`, err);
            }
          }

          await sql`UPDATE outbox SET status = 'QUEUED' WHERE id = ${msg.id}`;
          enqueueMessage(companyId, targetJid, msg.content, msg.id);

          await emitEvent(companyId, "message:sent", { outboxId: msg.id, jid: targetJid });
          broadcastWs(companyId, "message:sent", { outboxId: msg.id, jid: targetJid });

          console.log(`[outbox:${companyId}] Mensaje encolado para ${targetJid}`);
        } catch (err) {
          console.error(`[outbox:${companyId}] Error procesando mensaje ID=${msg.id}:`, err);
        }
      }
    }
  }, 2000);

  // Worker de Media Outbox: envía audios grabados — itera todas las empresas.
  let mediaWorkerRunning = false;
  setInterval(async () => {
    if (mediaWorkerRunning) return;
    mediaWorkerRunning = true;
    try {
      for (const companyId of listActiveSessions()) {
        const sock = getSocketFor(companyId);
        if (!sock) continue;

        const pending = await sql`SELECT * FROM media_outbox WHERE sent = 0 AND company_id = ${companyId}`;

        for (const item of pending as any[]) {
          await sql`UPDATE media_outbox SET sent = 2 WHERE id = ${item.id} AND sent = 0`;

          try {
            if (!item.filepath) {
              await sql`UPDATE media_outbox SET sent = 1 WHERE id = ${item.id}`;
              continue;
            }
            if (!fs.existsSync(item.filepath)) {
              await sql`UPDATE media_outbox SET sent = 1 WHERE id = ${item.id}`;
              continue;
            }

            const [convRow] = await sql`
              SELECT remote_jid FROM conversations WHERE id = ${item.conv_id} AND company_id = ${companyId}
            `;
            const rawJid    = (convRow as any)?.remote_jid || `${item.phone}@s.whatsapp.net`;
            const targetJid = await resolveMediaJid(companyId, rawJid);
            console.log(`[media-outbox:${companyId}] rawJid: ${rawJid} → targetJid: ${targetJid}`);

            const isPtt = item.ptt === 1;

            let sendFilepath = item.filepath;
            const isWebm = (item.mimetype || "").includes("webm") || item.filepath.endsWith(".webm");
            if (isWebm && ffmpegPath) {
              const oggPath = item.filepath.replace(/\.webm$/, ".ogg");
              try {
                await execFileAsync(ffmpegPath as string, [
                  "-y", "-i", item.filepath,
                  "-c:a", "libopus", "-b:a", "32k", "-ar", "48000", "-ac", "1",
                  oggPath,
                ]);
                sendFilepath = oggPath;
                console.log(`[media-outbox:${companyId}] webm→ogg convertido: ${oggPath}`);
              } catch (convErr) {
                console.warn(`[media-outbox:${companyId}] Conversión ffmpeg falló, enviando webm original:`, convErr);
              }
            }

            const sendMime  = sendFilepath.endsWith(".ogg")
              ? "audio/ogg; codecs=opus"
              : (item.mimetype || "audio/webm;codecs=opus");
            const buffer    = fs.readFileSync(sendFilepath);

            console.log(`[media-outbox:${companyId}] mime: ${sendMime}  ptt: ${isPtt}  bytes: ${buffer.length}`);
            const sendResult = await sock.sendMessage(targetJid, {
              audio: buffer, mimetype: sendMime, ptt: isPtt,
            });
            if (sendFilepath !== item.filepath) {
              try { fs.unlinkSync(sendFilepath); } catch { /* ignorar */ }
            }
            console.log(`[media-outbox:${companyId}] enviado — ptt:${isPtt} key:${sendResult?.key?.id ?? "sin key"}`);

            await sql`UPDATE media_outbox SET sent = 1 WHERE id = ${item.id}`;
            try { fs.unlinkSync(item.filepath); } catch { /* ya borrado */ }

            const msgId = `outbox_audio_${Date.now()}_${item.id}`;
            await sql`
              INSERT INTO messages (id, conversation_id, remote_jid, from_me, text, company_id)
              VALUES (${msgId}, ${String(item.conv_id)}, ${targetJid}, 1, '[🎵 Audio]', ${companyId})
              ON CONFLICT DO NOTHING
            `;

            broadcastWs(companyId, "message:new", { conversationId: String(item.conv_id) });
            console.log(`[media-outbox:${companyId}] ✓ Completado para ${targetJid}`);
          } catch (err) {
            await sql`UPDATE media_outbox SET sent = 0 WHERE id = ${item.id} AND sent = 2`;
            console.error(`[media-outbox:${companyId}] Error enviando media ID=${item.id}:`, err);
          }
        }
      }
    } finally {
      mediaWorkerRunning = false;
    }
  }, 2000);

  // Monitor de reinicio/logout — señal por empresa: data/.restart-<companyId>
  // Solo afecta la sesión de esa empresa, no mata el proceso ni a las demás.
  setInterval(async () => {
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) return;

    for (const file of fs.readdirSync(dataDir)) {
      const match = file.match(/^\.restart-(.+)$/);
      if (!match) continue;
      const companyId = match[1];
      const restartFile = path.join(dataDir, file);

      console.log(`[restart:${companyId}] Señal de reinicio detectada...`);
      try {
        await stopSessionFor(companyId);
        fs.unlinkSync(restartFile);
        const authDir = path.resolve(process.cwd(), "auth", companyId);
        if (fs.existsSync(authDir)) {
          fs.rmSync(authDir, { recursive: true, force: true });
          console.log(`[restart:${companyId}] Carpeta auth borrada.`);
        }
        await startSessionFor(companyId);
        console.log(`[restart:${companyId}] Sesión reiniciada — esperando nuevo QR.`);
      } catch (error) {
        console.error(`[restart:${companyId}] Error durante el reinicio:`, error);
      }
    }
  }, 1000);

  // Monitor de conexión — señal por empresa: data/.connect-<companyId>
  // El proceso web (Next.js) corre separado del bot y no tiene acceso al
  // pool de sesiones en memoria, así que usa este mismo patrón de archivo
  // que `.restart-` para pedirle al bot que arranque una sesión nueva
  // (empresa que nunca se ha conectado, o que quiere reconectar sin borrar
  // sus credenciales existentes).
  setInterval(async () => {
    const dataDir = path.resolve(process.cwd(), "data");
    if (!fs.existsSync(dataDir)) return;

    for (const file of fs.readdirSync(dataDir)) {
      const match = file.match(/^\.connect-(.+)$/);
      if (!match) continue;
      const companyId = match[1];
      const connectFile = path.join(dataDir, file);

      try {
        fs.unlinkSync(connectFile);
        if (getSocketFor(companyId)) {
          console.log(`[connect:${companyId}] Sesión ya activa — nada que hacer.`);
          continue;
        }
        console.log(`[connect:${companyId}] Señal de conexión detectada — arrancando sesión...`);
        await startSessionFor(companyId);
      } catch (error) {
        console.error(`[connect:${companyId}] Error al arrancar sesión:`, error);
      }
    }
  }, 1000);
}

main().catch((err) => {
  console.error("Error fatal en el bot:", err);
  process.exit(1);
});
