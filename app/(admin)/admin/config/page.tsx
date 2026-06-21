"use client";

import { useEffect, useState } from "react";
import {
  Key, Brain, Globe, Save, Loader2, CheckCircle2,
  Eye, EyeOff, RefreshCw, ShieldAlert, Info,
} from "lucide-react";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "10px 40px 10px 14px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(114,85,180,0.2)",
  borderRadius: 8,
  fontSize: 13,
  color: "var(--color-text-primary)",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "monospace",
  letterSpacing: "0.02em",
};

const LABEL_STYLE: React.CSSProperties = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--color-text-faint)",
  marginBottom: 7,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

interface ConfigState {
  OPENAI_API_KEY: string;
  META_ACCESS_TOKEN: string;
  META_AD_ACCOUNT_ID_DEFAULT: string;
}

function MaskedInput({
  value, onChange, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        style={INPUT_STYLE}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        style={{
          position: "absolute", right: 12, top: "50%",
          transform: "translateY(-50%)",
          background: "none", border: "none",
          color: "var(--color-text-muted)", cursor: "pointer", padding: 0,
        }}
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function StatusDot({ configured }: { configured: boolean }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontSize: 11, fontWeight: 600,
      color: configured ? "#4ade80" : "#f87171",
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%",
        background: configured ? "#4ade80" : "#f87171",
        boxShadow: configured ? "0 0 6px #4ade80" : "0 0 6px #f87171",
      }} />
      {configured ? "Configurado" : "Sin configurar"}
    </div>
  );
}

export default function AdminConfigPage() {
  const [config, setConfig] = useState<ConfigState>({
    OPENAI_API_KEY: "",
    META_ACCESS_TOKEN: "",
    META_AD_ACCOUNT_ID_DEFAULT: "",
  });
  const [original, setOriginal] = useState<ConfigState>({ ...config });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/config")
      .then((r) => r.json())
      .then((d) => {
        const c = d.config || {};
        const state = {
          OPENAI_API_KEY: c.OPENAI_API_KEY || "",
          META_ACCESS_TOKEN: c.META_ACCESS_TOKEN || "",
          META_AD_ACCOUNT_ID_DEFAULT: c.META_AD_ACCOUNT_ID_DEFAULT || "",
        };
        setConfig(state);
        setOriginal(state);
        setLoading(false);
      });
  }, []);

  function set(key: keyof ConfigState, value: string) {
    setConfig((p) => ({ ...p, [key]: value }));
    setSuccess("");
    setError("");
  }

  const hasChanges = JSON.stringify(config) !== JSON.stringify(original);

  async function handleSave(keys?: (keyof ConfigState)[]) {
    setSaving(true);
    setError("");
    setSuccess("");

    const payload: Partial<ConfigState> = {};
    const toSave = keys || (Object.keys(config) as (keyof ConfigState)[]);
    for (const k of toSave) {
      if (config[k] !== undefined) payload[k] = config[k];
    }

    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (res.ok) {
      setOriginal({ ...config });
      setSuccess("Configuración guardada correctamente");
      setTimeout(() => setSuccess(""), 3500);
    } else {
      const d = await res.json();
      setError(d.error || "Error al guardar");
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "80px 0", color: "var(--color-text-muted)", justifyContent: "center" }}>
        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
        Cargando configuración...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", margin: 0 }}>
          Configuración Global
        </h1>
        <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "5px 0 0" }}>
          APIs y credenciales que comparten todos los clientes de Portalu
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        display: "flex", gap: 12, padding: "14px 16px",
        background: "rgba(114,85,180,0.08)", border: "1px solid rgba(114,85,180,0.2)",
        borderRadius: 10, marginBottom: 28,
      }}>
        <Info size={16} color="var(--color-violet-soft)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          Estas son las credenciales <strong style={{ color: "#c4bcde" }}>globales de Portalu</strong>.
          Cada empresa puede tener las suyas propias (configúralas en el perfil del cliente).
          Si la empresa no tiene credenciales propias, se usan estas por defecto.
        </div>
      </div>

      {/* OpenAI */}
      <div style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.15)", borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(16,163,127,0.12)", border: "1px solid rgba(16,163,127,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Brain size={18} color="#10a37f" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>OpenAI</div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>Alimenta ALU.IA — el asistente de inteligencia artificial</div>
            </div>
          </div>
          <StatusDot configured={!!config.OPENAI_API_KEY} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>API Key de OpenAI</label>
          <MaskedInput
            value={config.OPENAI_API_KEY}
            onChange={(v) => set("OPENAI_API_KEY", v)}
            placeholder="sk-proj-..."
          />
          <div style={{ fontSize: 11, color: "#3a3550", marginTop: 6 }}>
            Obtén tu key en platform.openai.com/api-keys — Se recomienda usar GPT-4o mini para máxima eficiencia
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => handleSave(["OPENAI_API_KEY"])}
            disabled={saving || config.OPENAI_API_KEY === original.OPENAI_API_KEY}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px",
              background: config.OPENAI_API_KEY !== original.OPENAI_API_KEY ? "linear-gradient(135deg, #0d7a60, #10a37f)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${config.OPENAI_API_KEY !== original.OPENAI_API_KEY ? "rgba(16,163,127,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 7, fontSize: 12, fontWeight: 600,
              color: config.OPENAI_API_KEY !== original.OPENAI_API_KEY ? "#fff" : "var(--color-text-muted)",
              cursor: config.OPENAI_API_KEY !== original.OPENAI_API_KEY ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={12} />}
            Guardar
          </button>
        </div>
      </div>

      {/* Meta Ads */}
      <div style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.15)", borderRadius: 14, padding: 24, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(24,119,242,0.12)", border: "1px solid rgba(24,119,242,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Globe size={18} color="#1877f2" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)" }}>Meta Ads</div>
              <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>Token global para clientes cuyas cuentas administras tú</div>
            </div>
          </div>
          <StatusDot configured={!!config.META_ACCESS_TOKEN} />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Token de Acceso Global (Meta)</label>
          <MaskedInput
            value={config.META_ACCESS_TOKEN}
            onChange={(v) => set("META_ACCESS_TOKEN", v)}
            placeholder="EAAxxxxxxxxxxxxxxx..."
          />
          <div style={{ fontSize: 11, color: "#3a3550", marginTop: 6 }}>
            Token de tu Business Manager. Los clientes con token propio lo sobreescriben automáticamente.
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={LABEL_STYLE}>Ad Account ID por defecto <span style={{ color: "var(--color-text-muted)", textTransform: "none", letterSpacing: 0 }}>(cuenta de prueba / demos)</span></label>
          <div style={{ position: "relative" }}>
            <input
              style={{ ...INPUT_STYLE, paddingLeft: 14 }}
              type="text"
              value={config.META_AD_ACCOUNT_ID_DEFAULT}
              onChange={(e) => set("META_AD_ACCOUNT_ID_DEFAULT", e.target.value)}
              placeholder="act_XXXXXXXXXXXXXXXXX"
              autoComplete="off"
            />
          </div>
          <div style={{ fontSize: 11, color: "#3a3550", marginTop: 6 }}>
            Solo se usa cuando un cliente no tiene su propio Ad Account ID configurado.
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => handleSave(["META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID_DEFAULT"])}
            disabled={saving || (config.META_ACCESS_TOKEN === original.META_ACCESS_TOKEN && config.META_AD_ACCOUNT_ID_DEFAULT === original.META_AD_ACCOUNT_ID_DEFAULT)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 18px",
              background: (config.META_ACCESS_TOKEN !== original.META_ACCESS_TOKEN || config.META_AD_ACCOUNT_ID_DEFAULT !== original.META_AD_ACCOUNT_ID_DEFAULT) ? "linear-gradient(135deg, #0d3580, #1877f2)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${(config.META_ACCESS_TOKEN !== original.META_ACCESS_TOKEN || config.META_AD_ACCOUNT_ID_DEFAULT !== original.META_AD_ACCOUNT_ID_DEFAULT) ? "rgba(24,119,242,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 7, fontSize: 12, fontWeight: 600,
              color: (config.META_ACCESS_TOKEN !== original.META_ACCESS_TOKEN || config.META_AD_ACCOUNT_ID_DEFAULT !== original.META_AD_ACCOUNT_ID_DEFAULT) ? "#fff" : "var(--color-text-muted)",
              cursor: (config.META_ACCESS_TOKEN !== original.META_ACCESS_TOKEN || config.META_AD_ACCOUNT_ID_DEFAULT !== original.META_AD_ACCOUNT_ID_DEFAULT) ? "pointer" : "not-allowed",
              transition: "all 0.2s",
            }}
          >
            {saving ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Save size={12} />}
            Guardar
          </button>
        </div>
      </div>

      {/* Security note */}
      <div style={{ display: "flex", gap: 10, padding: "14px 16px", background: "rgba(250,117,83,0.06)", border: "1px solid rgba(250,117,83,0.15)", borderRadius: 10, marginBottom: 24 }}>
        <ShieldAlert size={15} color="var(--color-coral)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 11.5, color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
          <strong style={{ color: "var(--color-coral)" }}>Seguridad:</strong> Las claves se almacenan cifradas en la base de datos y nunca se exponen al cliente final.
          Rota tus tokens regularmente desde los paneles de Meta y OpenAI.
        </div>
      </div>

      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 8, fontSize: 13, color: "#4ade80" }}>
          <CheckCircle2 size={15} /> {success}
        </div>
      )}
      {error && (
        <div style={{ padding: "12px 16px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, fontSize: 13, color: "#f87171" }}>
          {error}
        </div>
      )}

      <style>{`
        input::placeholder { color: #3a3550; }
        input:focus { border-color: rgba(114,85,180,0.5) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
