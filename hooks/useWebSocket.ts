"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface WsEvent {
  type:    string;
  payload: Record<string, unknown>;
  ts:      number;
}

// En producción, detrás de nginx, no se expone el puerto 3001 directo —
// se usa una URL completa (wss://dominio/ws) proxied a localhost:3001.
// En desarrollo local, sin proxy, se conecta directo a NEXT_PUBLIC_WS_HOST:PORT.
const WS_BASE_URL =
  typeof window !== "undefined"
    ? (process.env.NEXT_PUBLIC_WS_URL ||
       `ws://${process.env.NEXT_PUBLIC_WS_HOST ?? "localhost"}:${process.env.NEXT_PUBLIC_WS_PORT ?? "3001"}`)
    : null;

export function useWebSocket(onEvent: (e: WsEvent) => void): {
  connected: boolean;
} {
  const [connected, setConnected] = useState(false);

  const onEventRef   = useRef(onEvent);
  const wsRef        = useRef<WebSocket | null>(null);
  const retryRef     = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef   = useRef(false);
  const connectIdRef = useRef(0);
  const companyIdRef = useRef<string | null>(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  });

  const connect = useCallback(async () => {
    if (!mountedRef.current || !WS_BASE_URL) return;

    if (!companyIdRef.current) {
      try {
        const res  = await fetch("/api/connection/ws-token");
        const data = await res.json() as { companyId?: string };
        companyIdRef.current = data.companyId ?? "";
      } catch {
        companyIdRef.current = "";
      }
      if (!mountedRef.current) return;
    }

    const wsUrl = companyIdRef.current
      ? `${WS_BASE_URL}?companyId=${encodeURIComponent(companyIdRef.current)}`
      : WS_BASE_URL;

    const myId = ++connectIdRef.current;

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    let ws: WebSocket;
    try {
      ws = new WebSocket(wsUrl);
    } catch (err) {
      console.error("🔴 Error al crear WebSocket:", err);
      if (mountedRef.current) {
        retryRef.current = setTimeout(connect, 2_000);
      }
      return;
    }

    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current || myId !== connectIdRef.current) return;
      console.log("🟢 WS Conectado con éxito →", wsUrl);
      setConnected(true);
    };

    ws.onmessage = (event) => {
      if (!mountedRef.current || myId !== connectIdRef.current) return;
      try {
        const parsed = JSON.parse(event.data as string) as WsEvent;
        if (parsed.type !== "connected") {
          onEventRef.current(parsed);
        }
      } catch { /* frames malformados — ignorar */ }
    };

    ws.onclose = (ev) => {
      if (!mountedRef.current || myId !== connectIdRef.current) return;
      console.warn(`🟡 WS cerrado (code=${ev.code}). Reconectando en 3 s…`);
      setConnected(false);
      retryRef.current = setTimeout(connect, 2_000);
    };

    ws.onerror = (ev) => {
      const msg = (ev as ErrorEvent).message || "Conexión rechazada o cerrada";
      console.warn("⚠️ Detalle técnico WS:", msg);
      ws.close();
    };
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { connected };
}
