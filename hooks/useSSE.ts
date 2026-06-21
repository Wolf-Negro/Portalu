"use client";

import { useEffect, useRef } from "react";
import type { WsEvent } from "./useWebSocket";

export function useSSE(onEvent: (e: WsEvent) => void): void {
  const lastIdRef  = useRef(0);
  const onEventRef = useRef(onEvent);
  const esRef      = useRef<EventSource | null>(null);
  const retryRef   = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mountedRef = useRef(false);

  useEffect(() => { onEventRef.current = onEvent; });

  useEffect(() => {
    mountedRef.current = true;

    function connect() {
      if (!mountedRef.current) return;

      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }

      const es = new EventSource(`/api/sse?since=${lastIdRef.current}`);
      esRef.current = es;

      es.onmessage = (evt) => {
        if (!mountedRef.current) return;
        try {
          const parsed = JSON.parse(evt.data) as {
            id:      number;
            type:    string;
            payload: Record<string, unknown>;
          };
          if (typeof parsed.id === "number") {
            lastIdRef.current = Math.max(lastIdRef.current, parsed.id);
          }
          onEventRef.current({ type: parsed.type, payload: parsed.payload, ts: Date.now() });
        } catch { /* frames malformados — ignorar */ }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        if (mountedRef.current) {
          retryRef.current = setTimeout(connect, 2_000);
        }
      };
    }

    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(retryRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []);
}
