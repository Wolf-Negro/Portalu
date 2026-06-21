"use client";

import { useCallback, useEffect, useRef } from "react";
import { useWebSocket, type WsEvent } from "./useWebSocket";
import { useSSE }                       from "./useSSE";

const ORIGINAL_TITLE = "Portalu";

let _ctx: AudioContext | null = null;

function getAudioCtx(): AudioContext {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _ctx;
}

export function initAudio() {
  try {
    const ctx = getAudioCtx();
    if (ctx.state === "suspended") ctx.resume();
  } catch { /* sin soporte */ }
}

async function playChime() {
  try {
    const ctx = getAudioCtx();

    if (ctx.state === "suspended") await ctx.resume();

    const tones: [number, number][] = [[880, 0], [1100, 0.13]];
    for (const [freq, delay] of tones) {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.22, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.4);
    }
  } catch (e) {
    console.warn("[notifications] Error reproduciendo sonido:", e);
  }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch { /* sin soporte */ }
}

export function useNotifications() {
  const unreadRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const unlock = () => { initAudio(); document.removeEventListener("click", unlock); };
    document.addEventListener("click", unlock);

    const onFocus = () => {
      unreadRef.current = 0;
      document.title    = ORIGINAL_TITLE;
    };
    window.addEventListener("focus", onFocus);

    return () => {
      document.removeEventListener("click", unlock);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  const handleEvent = useCallback((e: WsEvent) => {
    const payload = e.payload as Record<string, unknown>;

    if (e.type === "chat:updated" && payload.mode === "DERIVED") {
      playChime();
      showBrowserNotification(
        "✅ Nuevo Lead",
        "Un lead está listo para ser atendido."
      );
      unreadRef.current += 1;
      document.title = `✅ (${unreadRef.current}) Nuevo Lead — Portalu`;
      return;
    }

    if (e.type === "message:new" && payload.source === "user" && !document.hasFocus()) {
      playChime();
      unreadRef.current += 1;
      document.title = `💬 (${unreadRef.current}) Mensaje nuevo — Portalu`;
    }
  }, []);

  useWebSocket(handleEvent);
  useSSE(handleEvent);
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) return "denied";
  if (Notification.permission !== "default") {
    initAudio();
    return Notification.permission;
  }
  const result = await Notification.requestPermission();
  if (result === "granted") initAudio();
  return result;
}
