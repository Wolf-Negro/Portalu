"use client";

import { useEffect, useState } from "react";

export default function QRScreen() {
  const [data, setData] = useState<{ status: string; qr: string | null } | null>(null);

  useEffect(() => {
    // Le pide al bot que arranque la sesión de esta empresa si todavía no
    // existe (idempotente — si ya está conectada, el bot no hace nada).
    fetch("/api/connection/connect", { method: "POST" }).catch(() => {});

    const poll = async () => {
      try {
        const res  = await fetch("/api/connection/status");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        <p className="text-sm">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">Conectar WhatsApp</h1>

        {data.status === "qr" && data.qr ? (
          <div className="flex flex-col items-center">
            <p className="text-gray-600 mb-6">Escanea el código QR desde tu celular</p>
            <img src={data.qr} alt="WhatsApp QR" className="w-64 h-64 border-4 border-emerald-500 rounded-lg" />
          </div>
        ) : data.status === "connecting" || data.status === "disconnected" ? (
          <div className="flex flex-col items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mb-4" />
            <p className="text-gray-600">
              {data.status === "connecting" ? "Iniciando conexión..." : "Generando código QR..."}
            </p>
            <p className="text-xs text-gray-400 mt-2">Esto puede tardar unos segundos.</p>
          </div>
        ) : (
          <div className="py-12">
            <p className="text-red-500 mb-4">No se pudo conectar con WhatsApp.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition"
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
