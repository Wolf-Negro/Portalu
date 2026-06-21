import { WebSocketServer, WebSocket } from "ws";
import { LEGACY_COMPANY_ID } from "./bot-db";

let wss: WebSocketServer | null = null;
// Clientes agrupados por empresa — cada cliente solo recibe eventos de su
// propia companyId. Mientras el frontend (Fase 4) no envíe `?companyId=`
// explícito, se asume la empresa legacy (comportamiento idéntico al de antes
// de multi-tenant).
const clientsByCompany = new Map<string, Set<WebSocket>>();

function resolveCompanyIdFromUrl(url: string | undefined): string {
  if (!url) return LEGACY_COMPANY_ID;
  try {
    const parsed = new URL(url, "http://localhost");
    return parsed.searchParams.get("companyId") || LEGACY_COMPANY_ID;
  } catch {
    return LEGACY_COMPANY_ID;
  }
}

export function startWsServer(port: number = 3001): void {
  if (wss) {
    console.warn("[ws-server] Servidor ya activo — llamada duplicada ignorada");
    return;
  }

  const server = new WebSocketServer({ port });

  server.on("connection", (ws: WebSocket, req) => {
    const companyId = resolveCompanyIdFromUrl(req.url);
    if (!clientsByCompany.has(companyId)) clientsByCompany.set(companyId, new Set());
    const bucket = clientsByCompany.get(companyId)!;
    bucket.add(ws);

    ws.send(JSON.stringify({ type: "connected", ts: Date.now() }));
    ws.on("close", () => bucket.delete(ws));
    ws.on("error", () => { ws.terminate(); bucket.delete(ws); });
  });

  server.on("listening", () => {
    wss = server;
    console.log(`[ws-server] WebSocket server escuchando en puerto ${port}`);
  });

  server.on("error", (err: any) => {
    if (err?.code === "EADDRINUSE") {
      console.warn(`[ws-server] Puerto ${port} ocupado. Reintentando en 3 s...`);
      server.close();
      setTimeout(() => startWsServer(port), 3_000);
    } else {
      console.error("[ws-server] Error:", err);
    }
  });
}

export function broadcastWs(
  companyId: string,
  type: string,
  payload: Record<string, unknown> = {}
): void {
  const bucket = clientsByCompany.get(companyId);
  if (!wss || !bucket || bucket.size === 0) return;

  const message = JSON.stringify({ type, payload, ts: Date.now() });

  for (const client of bucket) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}
