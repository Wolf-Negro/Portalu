"use client";

import { useEffect, useRef, useState } from "react";
import QRScreen from "./QRScreen";

export default function ConnectionGate({ children }: { children: React.ReactNode }) {
  const [status,     setStatus]     = useState<string>("loading");
  const [timedOut,   setTimedOut]   = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Give the bot process 12 s to write its first state before showing an error
    timeoutRef.current = setTimeout(() => setTimedOut(true), 12_000);

    const checkStatus = async () => {
      try {
        const res  = await fetch("/api/connection/status");
        const data = await res.json() as { status: string };
        setStatus(data.status);
        if (data.status !== "disconnected") {
          clearTimeout(timeoutRef.current);
          setTimedOut(true); // stop suppressing error display
        }
      } catch {
        setStatus("error");
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeoutRef.current);
    };
  }, []);

  if (status === "loading" || (status === "disconnected" && !timedOut)) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        <p className="text-sm">Iniciando bot de WhatsApp...</p>
      </div>
    );
  }

  if (status === "connected") return <>{children}</>;

  return <QRScreen />;
}
