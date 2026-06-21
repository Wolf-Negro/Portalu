import { createHash } from "crypto";
import {
  getMetaSettings, getConfiguracionMeta, getAppConfig,
  setMetaTokenInvalid, setConfiguracionMetaTokenInvalid,
} from "./bot-db";

function isTokenError(responseData: Record<string, unknown>): boolean {
  const error = responseData?.error as { code?: number; type?: string } | undefined;
  return error?.code === 190 || error?.type === "OAuthException";
}

const META_API_VERSION = "v19.0";
const META_CAPI_BASE   = `https://graph.facebook.com/${META_API_VERSION}`;

function hashSHA256(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "");
}

export async function dispatchMetaEvent(
  companyId: string,
  phone: string,
  eventName: string,
  value?: number
): Promise<void> {
  const settings = await getMetaSettings(companyId);

  if (!settings?.pixel_id || !settings?.access_token) {
    console.log(`[meta-capi] Sin credenciales configuradas. Evento '${eventName}' omitido.`);
    return;
  }

  const eventTime   = Math.floor(Date.now() / 1000);
  const hashedPhone = hashSHA256(normalizePhone(phone));
  const eventId     = `${eventName}_${hashedPhone.slice(0, 8)}_${eventTime}`;

  const eventData: Record<string, unknown> = {
    event_name:    eventName,
    event_time:    eventTime,
    event_id:      eventId,
    action_source: "other",
    user_data: { ph: [hashedPhone] },
  };

  if (value !== undefined) {
    const currency = (await getAppConfig(companyId)).moneda || "PEN";
    eventData.custom_data = { value, currency };
  }

  const body: Record<string, unknown> = { data: [eventData] };

  if (settings.test_event_code?.trim()) {
    body.test_event_code = settings.test_event_code.trim();
  }

  const url = `${META_CAPI_BASE}/${settings.pixel_id}/events?access_token=${settings.access_token}`;

  try {
    const res = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const responseData = await res.json() as Record<string, unknown>;
    if (res.ok) {
      console.log(`[meta-capi] ✓ Evento '${eventName}' enviado.`, responseData);
      if (settings.token_invalid) await setMetaTokenInvalid(companyId, false);
    } else {
      console.error(`[meta-capi] Error HTTP ${res.status} en '${eventName}':`, responseData);
      if (isTokenError(responseData)) await setMetaTokenInvalid(companyId, true);
    }
  } catch (err) {
    console.error(`[meta-capi] Fallo de red al enviar evento '${eventName}':`, err);
  }
}

export interface ChatDataCAPI {
  phone:  string;
  wamid?: string;
  email?: string;
  value?: number;
}

export async function enviarEventoMetaCAPI(
  companyId: string,
  evento: "Lead" | "Purchase",
  chatData: ChatDataCAPI
): Promise<void> {
  const config = await getConfiguracionMeta(companyId);

  if (!config?.pixel_id?.trim() || !config?.capi_token?.trim()) {
    console.log(`[capi] Credenciales de Meta no configuradas. Evento '${evento}' omitido.`);
    return;
  }

  const { pixel_id, capi_token } = config;
  const eventTime   = Math.floor(Date.now() / 1000);
  const hashedPhone = hashSHA256(normalizePhone(chatData.phone));
  const eventId     = `${evento}_${hashedPhone.slice(0, 10)}_${eventTime}`;

  const userData: Record<string, unknown> = { ph: [hashedPhone] };
  if (chatData.email?.trim()) {
    userData.em = [hashSHA256(chatData.email.trim().toLowerCase())];
  }
  if (chatData.wamid?.trim()) {
    userData.client_message_id = chatData.wamid.trim();
  }

  const eventData: Record<string, unknown> = {
    event_name:    evento,
    event_time:    eventTime,
    event_id:      eventId,
    action_source: "other",
    user_data:     userData,
  };

  if (evento === "Purchase" && chatData.value !== undefined) {
    const currency = (await getAppConfig(companyId)).moneda || "PEN";
    eventData.custom_data = { value: chatData.value, currency };
  }

  const body: Record<string, unknown> = { data: [eventData] };
  const url  = `${META_CAPI_BASE}/${pixel_id}/events?access_token=${capi_token}`;

  try {
    const res  = await fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    });
    const json = await res.json() as Record<string, unknown>;
    if (res.ok) {
      console.log(`[capi] ✓ Evento '${evento}' enviado (wamid: ${chatData.wamid ?? "—"}):`, json);
      if (config.token_invalid) await setConfiguracionMetaTokenInvalid(companyId, false);
    } else {
      console.error(`[capi] Error HTTP ${res.status} en '${evento}':`, json);
      if (isTokenError(json)) await setConfiguracionMetaTokenInvalid(companyId, true);
    }
  } catch (err) {
    console.error(`[capi] Fallo de red al enviar evento '${evento}':`, err);
  }
}
