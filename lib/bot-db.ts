import postgres from "postgres";

const sql: postgres.Sql = postgres(process.env.DATABASE_URL ?? "postgresql://localhost/dev", {
  ssl:             "require",
  max:             3,
  idle_timeout:    20,
  connect_timeout: 10,
});

// Empresa (Company.id de Prisma) propietaria de los datos del bot creados antes
// de que el bot soportara multi-tenant. Se usa solo como DEFAULT temporal de
// backfill en initDB() — el código de aplicación nunca debe depender de esta
// constante directamente, siempre debe recibir companyId explícito.
const LEGACY_COMPANY_ID = "company-demo-001";

export type ConvTag =
  | "REGISTRO"
  | "PRECALIFICADO"
  | "ATENCION_COMERCIAL"
  | "PAGO_DIAGNOSTICO"
  | "NO_CALIFICA";

export async function initDB(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS conversations (
      id               SERIAL  PRIMARY KEY,
      phone            TEXT    UNIQUE NOT NULL,
      name             TEXT,
      mode             TEXT    DEFAULT 'AI' CHECK(mode IN ('AI', 'HUMAN', 'DERIVED')),
      tags             TEXT    NOT NULL DEFAULT '[]',
      meta_lead_sent   INTEGER NOT NULL DEFAULT 0,
      last_message_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      metadata         TEXT,
      remote_jid       TEXT,
      lead_scoring     INTEGER NOT NULL DEFAULT 0,
      ai_summary       TEXT    DEFAULT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id               TEXT PRIMARY KEY,
      conversation_id  INTEGER NOT NULL,
      remote_jid       TEXT NOT NULL,
      from_me          INTEGER DEFAULT 0,
      push_name        TEXT,
      text             TEXT,
      timestamp        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status           TEXT,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS connection_state (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      state       TEXT    NOT NULL,
      last_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS outbox (
      id          SERIAL  PRIMARY KEY,
      phone       TEXT    NOT NULL,
      content     TEXT    NOT NULL,
      retry_count INTEGER DEFAULT 0,
      sent        INTEGER DEFAULT 0,
      status      TEXT    DEFAULT 'PENDING',
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ai_settings (
      id               INTEGER PRIMARY KEY CHECK (id = 1),
      business_context TEXT    DEFAULT '',
      promotions       TEXT    DEFAULT '',
      handoff_rules    TEXT    DEFAULT 'Transfiere a un humano si el cliente está molesto o pide hablar con un asesor.',
      updated_at       INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS events (
      id         SERIAL  PRIMARY KEY,
      type       TEXT    NOT NULL,
      payload    TEXT    NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS meta_settings (
      id               INTEGER PRIMARY KEY CHECK (id = 1),
      pixel_id         TEXT    DEFAULT '',
      access_token     TEXT    DEFAULT '',
      test_event_code  TEXT    DEFAULT '',
      token_invalid    BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at       INTEGER NOT NULL DEFAULT EXTRACT(EPOCH FROM NOW())::INTEGER
    )
  `;
  await sql`ALTER TABLE meta_settings ADD COLUMN IF NOT EXISTS token_invalid BOOLEAN NOT NULL DEFAULT FALSE`;

  await sql`
    CREATE TABLE IF NOT EXISTS configuracion_meta (
      id               INTEGER PRIMARY KEY CHECK (id = 1),
      pixel_id         TEXT    NOT NULL DEFAULT '',
      capi_token       TEXT    NOT NULL DEFAULT '',
      test_event_code  TEXT    NOT NULL DEFAULT '',
      token_invalid    BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await sql`ALTER TABLE configuracion_meta ADD COLUMN IF NOT EXISTS token_invalid BOOLEAN NOT NULL DEFAULT FALSE`;

  await sql`
    CREATE TABLE IF NOT EXISTS app_config (
      id                   INTEGER PRIMARY KEY CHECK (id = 1),
      nombre_asesor        TEXT    DEFAULT NULL,
      nombre_conversion    TEXT    DEFAULT NULL,
      valor_conversion     NUMERIC DEFAULT 380,
      moneda               TEXT    DEFAULT 'PEN',
      sistema_prompt       TEXT    DEFAULT NULL,
      col1_name            TEXT    DEFAULT NULL,
      col2_name            TEXT    DEFAULT NULL,
      col3_name            TEXT    DEFAULT NULL,
      col4_name            TEXT    DEFAULT NULL,
      reglas_precalificar  TEXT    DEFAULT NULL,
      reglas_derivar       TEXT    DEFAULT NULL,
      openai_api_key       TEXT    DEFAULT NULL,
      whatsapp_asesor      TEXT    DEFAULT NULL,
      bot_delay_ms         INTEGER DEFAULT 2500,
      updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contact_jids (
      lid   TEXT PRIMARY KEY,
      phone TEXT NOT NULL
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS media_outbox (
      id         SERIAL  PRIMARY KEY,
      conv_id    TEXT    NOT NULL,
      phone      TEXT    NOT NULL,
      type       TEXT    NOT NULL,
      filepath   TEXT    NOT NULL,
      mimetype   TEXT    NOT NULL,
      ptt        INTEGER NOT NULL DEFAULT 0,
      sent       INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

  // Nota: ya no se inserta la fila singleton "id=1" aquí — la columna `id`
  // de estas tablas se elimina más abajo (migración multi-tenant) y cada
  // fila por empresa se crea de forma perezosa vía ensureSingletonRow().

  // ── Migración multi-tenant (Fase 1: columnas aditivas + backfill) ─────────
  const multiRowTables  = ["conversations", "messages", "outbox", "events", "media_outbox", "contact_jids"];
  const singletonTables = ["connection_state", "ai_settings", "meta_settings", "configuracion_meta", "app_config"];

  for (const table of [...multiRowTables, ...singletonTables]) {
    await sql.unsafe(
      `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS company_id TEXT DEFAULT '${LEGACY_COMPANY_ID}'`
    );
    await sql.unsafe(
      `UPDATE ${table} SET company_id = '${LEGACY_COMPANY_ID}' WHERE company_id IS NULL`
    );
  }

  await sql`CREATE INDEX IF NOT EXISTS idx_conversations_company_id ON conversations(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_messages_company_id      ON messages(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_outbox_company_id        ON outbox(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_events_company_id        ON events(company_id, id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_media_outbox_company_id  ON media_outbox(company_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_contact_jids_company_id  ON contact_jids(company_id)`;

  // ── Migración multi-tenant (Fase 2: constraints estrictas) ────────────────
  // company_id ya está 100% poblado (fase 1) y el código de aplicación ya
  // pasa companyId explícito en cada función — seguro fijar NOT NULL y mover
  // las claves de "una fila global" a "una fila por empresa".

  // conversations: el teléfono ya no es único globalmente, sino por empresa.
  await sql`ALTER TABLE conversations ALTER COLUMN company_id SET NOT NULL`;
  await sql`ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_phone_key`;
  await sql`ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_company_phone_key`;
  await sql`ALTER TABLE conversations ADD CONSTRAINT conversations_company_phone_key UNIQUE (company_id, phone)`;
  await sql`ALTER TABLE conversations ALTER COLUMN company_id DROP DEFAULT`;

  await sql`ALTER TABLE messages      ALTER COLUMN company_id SET NOT NULL`;
  await sql`ALTER TABLE messages      ALTER COLUMN company_id DROP DEFAULT`;
  await sql`ALTER TABLE outbox        ALTER COLUMN company_id SET NOT NULL`;
  await sql`ALTER TABLE outbox        ALTER COLUMN company_id DROP DEFAULT`;
  await sql`ALTER TABLE events        ALTER COLUMN company_id SET NOT NULL`;
  await sql`ALTER TABLE events        ALTER COLUMN company_id DROP DEFAULT`;
  await sql`ALTER TABLE media_outbox  ALTER COLUMN company_id SET NOT NULL`;
  await sql`ALTER TABLE media_outbox  ALTER COLUMN company_id DROP DEFAULT`;

  // contact_jids: el lid de WhatsApp se vuelve único por empresa, no global.
  await sql`ALTER TABLE contact_jids ALTER COLUMN company_id SET NOT NULL`;
  await sql`ALTER TABLE contact_jids DROP CONSTRAINT IF EXISTS contact_jids_pkey`;
  await sql`ALTER TABLE contact_jids ADD CONSTRAINT contact_jids_pkey PRIMARY KEY (company_id, lid)`;
  await sql`ALTER TABLE contact_jids ALTER COLUMN company_id DROP DEFAULT`;

  // Singletons "id=1" → una fila por empresa, PK = company_id.
  // La columna `id` queda vestigial (ya no es PK ni se filtra por ella en
  // ningún query) así que se elimina para no romper futuros INSERT (era
  // NOT NULL sin DEFAULT, pensada para una sola fila global).
  for (const table of singletonTables) {
    await sql.unsafe(`ALTER TABLE ${table} ALTER COLUMN company_id SET NOT NULL`);
    await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_id_check`);
    await sql.unsafe(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_pkey`);
    await sql.unsafe(`ALTER TABLE ${table} ADD CONSTRAINT ${table}_pkey PRIMARY KEY (company_id)`);
    await sql.unsafe(`ALTER TABLE ${table} ALTER COLUMN company_id DROP DEFAULT`);
    await sql.unsafe(`ALTER TABLE ${table} DROP COLUMN IF EXISTS id`);
  }

  console.log("[bot-db] Schema PostgreSQL inicializado");
}

/** Garantiza que exista la fila singleton de `table` para `companyId`. */
async function ensureSingletonRow(table: string, companyId: string): Promise<void> {
  await sql.unsafe(
    `INSERT INTO ${table} (company_id) VALUES ($1) ON CONFLICT (company_id) DO NOTHING`,
    [companyId]
  );
}

export async function getMessages(companyId: string, conversationId: string) {
  return sql`
    SELECT * FROM messages
    WHERE conversation_id = ${Number(conversationId)} AND company_id = ${companyId}
    ORDER BY timestamp ASC
  `;
}

export async function saveMessage(
  companyId: string, id: string, conversationId: string, remoteJid: string,
  fromMe: number, text: string, pushName?: string
) {
  await sql`
    INSERT INTO messages (id, conversation_id, remote_jid, from_me, text, push_name, company_id)
    VALUES (${id}, ${Number(conversationId)}, ${remoteJid}, ${fromMe}, ${text}, ${pushName ?? null}, ${companyId})
  `;
}

export async function getAISettings(companyId: string) {
  await ensureSingletonRow("ai_settings", companyId);
  const [row] = await sql`SELECT * FROM ai_settings WHERE company_id = ${companyId}`;
  return row as any;
}

export async function updateAISettings(companyId: string, data: {
  business_context: string;
  promotions:       string;
  handoff_rules:    string;
}) {
  await ensureSingletonRow("ai_settings", companyId);
  await sql`
    UPDATE ai_settings
    SET business_context = ${data.business_context},
        promotions       = ${data.promotions},
        handoff_rules    = ${data.handoff_rules},
        updated_at       = EXTRACT(EPOCH FROM NOW())::INTEGER
    WHERE company_id = ${companyId}
  `;
}

export async function setConversationMode(
  companyId: string, conversationId: string, mode: "AI" | "HUMAN" | "DERIVED"
) {
  await sql`
    UPDATE conversations SET mode = ${mode}
    WHERE id = ${conversationId} AND company_id = ${companyId}
  `;
}

export async function resolveConvId(companyId: string, param: string): Promise<string | null> {
  try {
    if (!param) return null;
    const decoded = decodeURIComponent(param);
    const clean   = decoded.split("@")[0];

    const [byId] = await sql`
      SELECT id FROM conversations WHERE id = ${decoded} AND company_id = ${companyId}
    `;
    if (byId) return String((byId as any).id);

    const like = `%${clean}%`;
    const [byPhone] = await sql`
      SELECT id FROM conversations
      WHERE (phone LIKE ${like} OR remote_jid LIKE ${like}) AND company_id = ${companyId}
      LIMIT 1
    `;
    if (byPhone) return String((byPhone as any).id);

    return null;
  } catch (err) {
    console.error("[bot-db] Error resolviendo ID:", err);
    return null;
  }
}

export async function insertMessage(
  companyId: string, conversationId: number | string, role: string, content: string
) {
  const msgId  = `${role}_${Date.now()}`;
  const fromMe = (role === "human" || role === "assistant" || role === "ai") ? 1 : 0;

  const [conv] = await sql`
    SELECT remote_jid FROM conversations
    WHERE id = ${Number(conversationId)} AND company_id = ${companyId}
  `;
  const remoteJid = (conv as any)?.remote_jid ||
    (String(conversationId).includes("@")
      ? String(conversationId)
      : `${conversationId}@s.whatsapp.net`);

  await sql`
    INSERT INTO messages (id, conversation_id, remote_jid, from_me, text, company_id)
    VALUES (${msgId}, ${Number(conversationId)}, ${remoteJid}, ${fromMe}, ${content}, ${companyId})
  `;
}

export async function getLastOutboundMessage(companyId: string, conversationId: string): Promise<string | null> {
  const [row] = await sql`
    SELECT text FROM messages
    WHERE conversation_id = ${Number(conversationId)} AND from_me = 1 AND company_id = ${companyId}
    ORDER BY timestamp DESC
    LIMIT 1
  `;
  return (row as any)?.text ?? null;
}

export async function enqueueOutbox(
  companyId: string, _conversationId: number | string, phone: string, content: string
) {
  await sql`
    INSERT INTO outbox (phone, content, status, sent, company_id)
    VALUES (${phone}, ${content}, 'PENDING', 0, ${companyId})
  `;
}

export async function getOrCreateConversation(
  companyId: string, phone: string, name?: string, remoteJid?: string
) {
  const cleanPhone = phone.split("@")[0];
  const jid        = remoteJid || `${cleanPhone}@s.whatsapp.net`;

  const [existing] = await sql`
    SELECT * FROM conversations WHERE phone = ${cleanPhone} AND company_id = ${companyId}
  `;

  if (existing) {
    if (remoteJid && (existing as any).remote_jid !== remoteJid) {
      await sql`UPDATE conversations SET remote_jid = ${remoteJid} WHERE id = ${(existing as any).id}`;
    }
    return existing;
  }

  const [inserted] = await sql`
    INSERT INTO conversations (phone, name, mode, remote_jid, company_id)
    VALUES (${cleanPhone}, ${name || cleanPhone}, 'AI', ${jid}, ${companyId})
    RETURNING *
  `;
  return inserted;
}

export async function getConversationById(companyId: string, id: string) {
  const [row] = await sql`SELECT * FROM conversations WHERE id = ${id} AND company_id = ${companyId}`;
  if (!row) return null;
  return { ...(row as any), mode: (row as any).mode || "AI" };
}

export async function getConvTags(companyId: string, conversationId: string): Promise<ConvTag[]> {
  const [row] = await sql`
    SELECT tags FROM conversations WHERE id = ${conversationId} AND company_id = ${companyId}
  `;
  if (!row) return [];
  try { return JSON.parse((row as any).tags || "[]") as ConvTag[]; } catch { return []; }
}

export async function setConvTags(companyId: string, conversationId: string, tags: ConvTag[]): Promise<void> {
  await sql`
    UPDATE conversations SET tags = ${JSON.stringify(tags)}
    WHERE id = ${conversationId} AND company_id = ${companyId}
  `;
}

export async function addConvTag(companyId: string, conversationId: string, tag: ConvTag): Promise<void> {
  const current = await getConvTags(companyId, conversationId);
  if (!current.includes(tag)) await setConvTags(companyId, conversationId, [...current, tag]);
}

export async function removeConvTag(companyId: string, conversationId: string, tag: ConvTag): Promise<void> {
  const current = await getConvTags(companyId, conversationId);
  await setConvTags(companyId, conversationId, current.filter((t) => t !== tag));
}

export async function emitEvent(
  companyId: string, type: string, payload: Record<string, unknown> = {}
): Promise<void> {
  await sql`
    INSERT INTO events (type, payload, company_id) VALUES (${type}, ${JSON.stringify(payload)}, ${companyId})
  `;
  await sql`DELETE FROM events WHERE created_at < EXTRACT(EPOCH FROM NOW())::INTEGER - 600`;
}

export async function getEventsSince(
  companyId: string, lastId: number
): Promise<Array<{ id: number; type: string; payload: string }>> {
  const rows = await sql`
    SELECT id, type, payload FROM events
    WHERE id > ${lastId} AND company_id = ${companyId}
    ORDER BY id ASC
    LIMIT 50
  `;
  return rows as unknown as Array<{ id: number; type: string; payload: string }>;
}

export interface ConfiguracionMeta {
  pixel_id:        string;
  capi_token:      string;
  test_event_code: string;
  token_invalid:   boolean;
  updated_at:      string;
}

export async function getConfiguracionMeta(companyId: string): Promise<ConfiguracionMeta | undefined> {
  await ensureSingletonRow("configuracion_meta", companyId);
  const [row] = await sql`
    SELECT pixel_id, capi_token, test_event_code, token_invalid, updated_at
    FROM configuracion_meta WHERE company_id = ${companyId}
  `;
  return row as ConfiguracionMeta | undefined;
}

export async function updateConfiguracionMeta(companyId: string, data: {
  pixel_id:        string;
  capi_token:      string;
  test_event_code: string;
}): Promise<void> {
  await ensureSingletonRow("configuracion_meta", companyId);
  await sql`
    UPDATE configuracion_meta
    SET pixel_id        = ${data.pixel_id.trim()},
        capi_token      = ${data.capi_token.trim()},
        test_event_code = ${data.test_event_code.trim()},
        token_invalid   = FALSE,
        updated_at      = CURRENT_TIMESTAMP
    WHERE company_id = ${companyId}
  `;
}

export async function setConfiguracionMetaTokenInvalid(companyId: string, invalid: boolean): Promise<void> {
  await sql`UPDATE configuracion_meta SET token_invalid = ${invalid} WHERE company_id = ${companyId}`;
}

export async function getMetaSettings(companyId: string): Promise<
  { pixel_id: string; access_token: string; test_event_code: string; token_invalid: boolean } | undefined
> {
  await ensureSingletonRow("meta_settings", companyId);
  const [row] = await sql`
    SELECT pixel_id, access_token, test_event_code, token_invalid
    FROM meta_settings WHERE company_id = ${companyId}
  `;
  return row as any;
}

export async function updateMetaSettings(companyId: string, data: {
  pixel_id:        string;
  access_token:    string;
  test_event_code: string;
}): Promise<void> {
  await ensureSingletonRow("meta_settings", companyId);
  await sql`
    UPDATE meta_settings
    SET pixel_id        = ${data.pixel_id},
        access_token    = ${data.access_token},
        test_event_code = ${data.test_event_code},
        token_invalid   = FALSE,
        updated_at      = EXTRACT(EPOCH FROM NOW())::INTEGER
    WHERE company_id = ${companyId}
  `;
}

export async function setMetaTokenInvalid(companyId: string, invalid: boolean): Promise<void> {
  await sql`UPDATE meta_settings SET token_invalid = ${invalid} WHERE company_id = ${companyId}`;
}

export interface AppConfig {
  nombre_asesor:       string | null;
  nombre_conversion:   string | null;
  valor_conversion:    number;
  moneda:              string;
  sistema_prompt:      string | null;
  col1_name:           string | null;
  col2_name:           string | null;
  col3_name:           string | null;
  col4_name:           string | null;
  reglas_precalificar: string | null;
  reglas_derivar:      string | null;
  openai_api_key:      string | null;
  whatsapp_asesor:     string | null;
  bot_delay_ms:        number;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  nombre_asesor:       null,
  nombre_conversion:   null,
  valor_conversion:    380,
  moneda:              "PEN",
  sistema_prompt:      null,
  col1_name:           null,
  col2_name:           null,
  col3_name:           null,
  col4_name:           null,
  reglas_precalificar: null,
  reglas_derivar:      null,
  openai_api_key:      null,
  whatsapp_asesor:     null,
  bot_delay_ms:        2500,
};

export async function getAppConfig(companyId: string): Promise<AppConfig> {
  try {
    await ensureSingletonRow("app_config", companyId);
    const [row] = await sql`
      SELECT nombre_asesor, nombre_conversion, valor_conversion, moneda,
             sistema_prompt, col1_name, col2_name, col3_name, col4_name,
             reglas_precalificar, reglas_derivar, openai_api_key, whatsapp_asesor, bot_delay_ms
      FROM app_config WHERE company_id = ${companyId}
    `;
    if (!row) return { ...APP_CONFIG_DEFAULTS };
    const r = row as Record<string, unknown>;
    return {
      nombre_asesor:       (r.nombre_asesor       as string | null) ?? null,
      nombre_conversion:   (r.nombre_conversion   as string | null) ?? null,
      valor_conversion:    Number(r.valor_conversion) || 380,
      moneda:              String(r.moneda ?? "").trim() || "PEN",
      sistema_prompt:      (r.sistema_prompt      as string | null) ?? null,
      col1_name:           (r.col1_name           as string | null) ?? null,
      col2_name:           (r.col2_name           as string | null) ?? null,
      col3_name:           (r.col3_name           as string | null) ?? null,
      col4_name:           (r.col4_name           as string | null) ?? null,
      reglas_precalificar: (r.reglas_precalificar as string | null) ?? null,
      reglas_derivar:      (r.reglas_derivar      as string | null) ?? null,
      openai_api_key:      (r.openai_api_key      as string | null) ?? null,
      whatsapp_asesor:     (r.whatsapp_asesor     as string | null) ?? null,
      bot_delay_ms:        Number(r.bot_delay_ms) || 2500,
    };
  } catch {
    return { ...APP_CONFIG_DEFAULTS };
  }
}

export async function updateAppConfig(companyId: string, data: Partial<AppConfig>): Promise<void> {
  const current   = await getAppConfig(companyId);
  const valorRaw  = Number(data.valor_conversion ?? current.valor_conversion);
  const valorSafe = isFinite(valorRaw) && valorRaw > 0 ? valorRaw : 380;
  const botDelay  = Number(data.bot_delay_ms ?? current.bot_delay_ms);
  const botMs     = isFinite(botDelay) && botDelay >= 500 ? botDelay : current.bot_delay_ms;
  const apiKey    = data.openai_api_key !== undefined
    ? (data.openai_api_key?.trim() || null) : current.openai_api_key;
  const asesorWa  = data.whatsapp_asesor !== undefined
    ? (data.whatsapp_asesor?.trim() || null) : current.whatsapp_asesor;

  await sql`
    UPDATE app_config
    SET nombre_asesor       = ${data.nombre_asesor?.trim()       ?? current.nombre_asesor},
        nombre_conversion   = ${data.nombre_conversion?.trim()   ?? current.nombre_conversion},
        valor_conversion    = ${valorSafe},
        moneda              = ${data.moneda?.trim()              || current.moneda},
        sistema_prompt      = ${data.sistema_prompt?.trim()      || null},
        col1_name           = ${data.col1_name?.trim()           || null},
        col2_name           = ${data.col2_name?.trim()           || null},
        col3_name           = ${data.col3_name?.trim()           || null},
        col4_name           = ${data.col4_name?.trim()           || null},
        reglas_precalificar = ${data.reglas_precalificar?.trim() || null},
        reglas_derivar      = ${data.reglas_derivar?.trim()      || null},
        openai_api_key      = ${apiKey},
        whatsapp_asesor     = ${asesorWa},
        bot_delay_ms        = ${botMs},
        updated_at          = CURRENT_TIMESTAMP
    WHERE company_id = ${companyId}
  `;
}

export async function isMetaLeadSent(companyId: string, conversationId: string): Promise<boolean> {
  const [row] = await sql`
    SELECT meta_lead_sent FROM conversations WHERE id = ${conversationId} AND company_id = ${companyId}
  `;
  return ((row as any)?.meta_lead_sent ?? 0) === 1;
}

export async function markMetaLeadSent(companyId: string, conversationId: string): Promise<void> {
  await sql`
    UPDATE conversations SET meta_lead_sent = 1 WHERE id = ${conversationId} AND company_id = ${companyId}
  `;
}

export async function updateLeadScoring(companyId: string, conversationId: string, scoring: number): Promise<void> {
  await sql`
    UPDATE conversations
    SET lead_scoring = ${Math.min(100, Math.max(0, Math.round(scoring)))}
    WHERE id = ${conversationId} AND company_id = ${companyId}
  `;
}

export async function enqueueMediaOutbox(
  companyId: string,
  convId:   string | number,
  phone:    string,
  type:     "audio" | "image" | "document",
  filepath: string,
  mimetype: string,
  ptt:      boolean
): Promise<void> {
  await sql`
    INSERT INTO media_outbox (conv_id, phone, type, filepath, mimetype, ptt, company_id)
    VALUES (${String(convId)}, ${phone}, ${type}, ${filepath}, ${mimetype}, ${ptt ? 1 : 0}, ${companyId})
  `;
}

export async function updateAiSummary(companyId: string, conversationId: string, summary: string): Promise<void> {
  await sql`
    UPDATE conversations SET ai_summary = ${summary.slice(0, 150)}
    WHERE id = ${conversationId} AND company_id = ${companyId}
  `;
}

export async function upsertContactJid(companyId: string, lid: string, phone: string): Promise<void> {
  await sql`
    INSERT INTO contact_jids (lid, phone, company_id) VALUES (${lid}, ${phone}, ${companyId})
    ON CONFLICT (company_id, lid) DO UPDATE SET phone = EXCLUDED.phone
  `;
}

export async function resolveMediaJid(companyId: string, lidOrPhone: string): Promise<string> {
  if (lidOrPhone.includes("@s.whatsapp.net") || lidOrPhone.includes("@g.us")) {
    return lidOrPhone;
  }
  if (lidOrPhone.endsWith("@lid")) {
    const [row] = await sql`
      SELECT phone FROM contact_jids WHERE lid = ${lidOrPhone} AND company_id = ${companyId}
    `;
    if ((row as any)?.phone) return `${(row as any).phone}@s.whatsapp.net`;
    return lidOrPhone;
  }
  return `${lidOrPhone}@s.whatsapp.net`;
}

export { sql, LEGACY_COMPANY_ID };
export default sql;
