import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers,
  WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import path from "path";
import fs from "fs/promises";
import { sql, upsertContactJid } from "../bot-db";
import { messageHandler } from "./handler";
import { getStoredMessage } from "../bot-message-queue";

const logger = pino({ level: "silent" });

export interface BotSession {
  companyId: string;
  sock:      WASocket | null;
  status:    "connecting" | "qr" | "connected" | "disconnected";
}

// Pool de sesiones Baileys en memoria — una por empresa. Un solo proceso Node
// administra todas las sesiones activas (ver plan multi-tenant: para un
// número modesto de empresas esto es más simple y liviano que un proceso
// PM2 por empresa).
const sessions = new Map<string, BotSession>();

async function setConnectionState(companyId: string, state: string): Promise<void> {
  await sql`
    INSERT INTO connection_state (state, company_id) VALUES (${state}, ${companyId})
    ON CONFLICT (company_id) DO UPDATE SET state = EXCLUDED.state, last_update = CURRENT_TIMESTAMP
  `;
}

/** Arranca (o devuelve, si ya existe) la sesión de WhatsApp de una empresa. */
export async function startSessionFor(companyId: string): Promise<WASocket> {
  const existing = sessions.get(companyId);
  if (existing?.sock) return existing.sock;

  const authDir = path.resolve(process.cwd(), "auth", companyId);
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal:        true,
    auth:                     state,
    logger,
    browser:                  Browsers.macOS("Desktop"),
    syncFullHistory:           false,
    markOnlineOnConnect:       true,
    shouldSyncHistoryMessage:  () => false,
    getMessage: async (key) => {
      const text = getStoredMessage(key.id ?? "");
      if (text) return { conversation: text };
      return undefined;
    },
  });

  const session: BotSession = { companyId, sock, status: "connecting" };
  sessions.set(companyId, session);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      session.status = "qr";
      await setConnectionState(companyId, `qr:${qr}`);
    }
    if (connection === "connecting") {
      session.status = "connecting";
      await setConnectionState(companyId, "connecting");
    }

    if (connection === "open") {
      session.status = "connected";
      const user = sock.user?.id || "unknown";
      await setConnectionState(companyId, `connected:${user}`);
      console.log(`[baileys:${companyId}] Conectado a WhatsApp!`);
    }

    if (connection === "close") {
      const boomError   = lastDisconnect?.error as Boom;
      const statusCode  = boomError?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      session.status = "disconnected";
      await setConnectionState(companyId, "disconnected");
      console.log(`[baileys:${companyId}] Conexión cerrada — código: ${statusCode ?? "desconocido"}`);

      if (isLoggedOut) {
        console.log(`[baileys:${companyId}] Sesión cerrada (loggedOut). Borrando credenciales y reiniciando para QR...`);
        sessions.delete(companyId);
        // Sin esto, useMultiFileAuthState() vuelve a cargar las MISMAS
        // credenciales ya inválidas en el próximo intento, y Baileys recibe
        // 401 de nuevo de inmediato — bucle infinito que nunca llega a
        // generar un QR nuevo para volver a vincular el número.
        try {
          await fs.rm(authDir, { recursive: true, force: true });
        } catch (err) {
          console.error(`[baileys:${companyId}] Error borrando credenciales viejas:`, err);
        }
        setTimeout(() => startSessionFor(companyId).catch((err) =>
          console.error(`[baileys:${companyId}] Error reiniciando sesión:`, err)
        ), 3000);
        return;
      }

      const delay = statusCode === 440 ? 15_000 : 5_000;
      console.log(`[baileys:${companyId}] Reconectando en ${delay / 1000}s...`);
      sessions.delete(companyId);
      setTimeout(() => startSessionFor(companyId).catch((err) =>
        console.error(`[baileys:${companyId}] Error reconectando sesión:`, err)
      ), delay);
    }
  });

  const processContacts = async (contacts: any[]) => {
    for (const c of contacts) {
      const phone = String(c.id  || "");
      const lid   = String(c.lid || "");
      if (lid && phone.includes("@s.whatsapp.net")) {
        const lidKey     = lid.includes("@") ? lid : `${lid}@lid`;
        const phoneClean = phone.split("@")[0];
        await upsertContactJid(companyId, lidKey, phoneClean);
      }
    }
  };

  sock.ev.on("messaging-history.set", async ({ contacts }) => processContacts(contacts));
  sock.ev.on("contacts.upsert",        async (contacts)    => processContacts(contacts));
  sock.ev.on("contacts.update",        async (updates)     => processContacts(updates));

  messageHandler(sock, companyId);

  return sock;
}

/** Cierra la sesión de una empresa sin afectar al resto del proceso ni de las demás empresas. */
export async function stopSessionFor(companyId: string): Promise<void> {
  const session = sessions.get(companyId);
  if (!session?.sock) return;
  try {
    await session.sock.logout();
    session.sock.end(undefined);
  } catch (err) {
    console.error(`[baileys:${companyId}] Error al desconectar:`, err);
  } finally {
    sessions.delete(companyId);
  }
}

export function getSocketFor(companyId: string): WASocket | null {
  return sessions.get(companyId)?.sock ?? null;
}

export function getSessionStatus(companyId: string): BotSession["status"] | "idle" {
  return sessions.get(companyId)?.status ?? "idle";
}

export function listActiveSessions(): string[] {
  return Array.from(sessions.keys());
}

/**
 * Al boot del proceso, reanuda automáticamente solo las sesiones que estaban
 * conectadas la última vez (lee connection_state). Empresas nuevas no arrancan
 * sesión hasta que su admin pida conectar WhatsApp explícitamente.
 */
export async function autoStartActiveSessions(): Promise<void> {
  const rows = await sql`
    SELECT DISTINCT company_id FROM connection_state WHERE state LIKE 'connected:%'
  `;
  for (const row of rows as any[]) {
    const companyId = row.company_id as string;
    console.log(`[session-manager] Reanudando sesión activa para empresa ${companyId}...`);
    startSessionFor(companyId).catch((err) =>
      console.error(`[session-manager] Error reanudando sesión de ${companyId}:`, err)
    );
  }
}
