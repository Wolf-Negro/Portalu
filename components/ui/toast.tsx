"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastType = "error" | "success" | "info";

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastType, typeof Info> = {
  error: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

const COLORS: Record<ToastType, { bg: string; border: string; color: string }> = {
  error:   { bg: "rgba(239,68,68,0.12)",  border: "rgba(239,68,68,0.35)",  color: "var(--color-danger)" },
  success: { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)",  color: "var(--color-success)" },
  info:    { bg: "rgba(114,85,180,0.12)", border: "rgba(114,85,180,0.35)", color: "var(--color-lavender)" },
};

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "error") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          const c = COLORS[t.type];
          return (
            <div
              key={t.id}
              className="flex items-start gap-2 p-3 rounded-lg text-sm shadow-lg animate-slide-up"
              style={{ background: "var(--color-surface-2)", border: `1px solid ${c.border}`, color: "var(--color-text-primary)" }}
            >
              <Icon size={16} style={{ color: c.color, flexShrink: 0, marginTop: 2 }} />
              <span className="flex-1">{t.message}</span>
              <button onClick={() => dismiss(t.id)} style={{ color: "var(--color-text-muted)" }}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de <ToastProvider>");
  return ctx;
}
