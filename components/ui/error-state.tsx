"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export function ErrorState({
  message = "Algo salió mal al cargar los datos.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)" }}
      >
        <AlertTriangle size={18} style={{ color: "var(--color-danger)" }} />
      </div>
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{ background: "rgba(114,85,180,0.15)", color: "var(--color-lavender)", border: "1px solid rgba(114,85,180,0.3)" }}
        >
          <RefreshCw size={12} />
          Reintentar
        </button>
      )}
    </div>
  );
}
