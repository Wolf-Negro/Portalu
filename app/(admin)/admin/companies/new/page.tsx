"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(114,85,180,0.2)",
  borderRadius: 7,
  fontSize: 13.5,
  color: "#e9e8e6",
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 0.15s",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "#7a7590",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
};

const SECTION_STYLE: React.CSSProperties = {
  background: "rgba(14,14,28,0.7)",
  border: "1px solid rgba(114,85,180,0.14)",
  borderRadius: 12,
  padding: 24,
  marginBottom: 20,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  );
}

export default function NewCompanyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [useOwnToken, setUseOwnToken] = useState(false);

  const [form, setForm] = useState({
    name: "",
    website: "",
    phone: "",
    plan: "starter",
    metaAdAccountId: "",
    metaAccessToken: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body = {
      ...form,
      metaAdAccountId: form.metaAdAccountId || null,
      metaAccessToken: useOwnToken ? form.metaAccessToken || null : null,
    };

    const res = await fetch("/api/admin/companies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Error al crear cliente");
      return;
    }

    router.push("/admin");
  }

  return (
    <div style={{ maxWidth: 680, margin: "0 auto" }}>
      {/* Back */}
      <Link
        href="/admin"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          fontSize: 13,
          color: "#7a7590",
          textDecoration: "none",
          marginBottom: 24,
          transition: "color 0.15s",
        }}
      >
        <ArrowLeft size={14} /> Volver a clientes
      </Link>

      <h1 style={{ fontSize: 20, fontWeight: 800, color: "#e9e8e6", marginBottom: 6, letterSpacing: "-0.03em" }}>
        Nuevo Cliente
      </h1>
      <p style={{ fontSize: 13, color: "#5a5575", marginBottom: 28 }}>
        Crea una empresa y su usuario administrador inicial.
      </p>

      <form onSubmit={handleSubmit}>
        {/* ── Empresa ── */}
        <div style={SECTION_STYLE}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fa7553", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>
            Empresa
          </div>

          <Field label="Nombre *">
            <input
              style={INPUT_STYLE}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Empresa X S.A.C."
              required
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Website">
              <input
                style={INPUT_STYLE}
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                placeholder="https://empresa.pe"
              />
            </Field>
            <Field label="Teléfono">
              <input
                style={INPUT_STYLE}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+51 999 000 000"
              />
            </Field>
          </div>

          <Field label="Plan">
            <select
              style={{ ...INPUT_STYLE, cursor: "pointer" }}
              value={form.plan}
              onChange={(e) => set("plan", e.target.value)}
            >
              <option value="starter">Starter — básico</option>
              <option value="pro">Pro — avanzado</option>
              <option value="agency">Agency — completo</option>
            </select>
          </Field>
        </div>

        {/* ── Meta Ads ── */}
        <div style={SECTION_STYLE}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fa7553", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>
            Meta Ads
          </div>

          {/* Token type toggle */}
          <div style={{ marginBottom: 18 }}>
            <label style={LABEL_STYLE}>Tipo de acceso</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { value: false, label: "Token general de Alucinando", desc: "Para clientes cuyas campañas gestiona Alucinando" },
                { value: true, label: "Token propio del cliente", desc: "Para clientes independientes con su propio Business Manager" },
              ].map((opt) => (
                <label
                  key={String(opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    padding: "12px 14px",
                    borderRadius: 8,
                    border: `1px solid ${useOwnToken === opt.value ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.15)"}`,
                    background: useOwnToken === opt.value ? "rgba(43,9,111,0.2)" : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    checked={useOwnToken === opt.value}
                    onChange={() => setUseOwnToken(opt.value)}
                    style={{ marginTop: 2, accentColor: "#7255b4" }}
                  />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e9e8e6" }}>{opt.label}</div>
                    <div style={{ fontSize: 12, color: "#7a7590", marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <Field label="Meta Ad Account ID">
            <input
              style={INPUT_STYLE}
              value={form.metaAdAccountId}
              onChange={(e) => set("metaAdAccountId", e.target.value)}
              placeholder="act_XXXXXXXXXXXXXXXXX"
            />
          </Field>

          {useOwnToken && (
            <Field label="Meta Access Token (propio)">
              <input
                style={INPUT_STYLE}
                type="text"
                value={form.metaAccessToken}
                onChange={(e) => set("metaAccessToken", e.target.value)}
                placeholder="EAAxxxxxxxxxxxxxxx..."
              />
            </Field>
          )}
        </div>

        {/* ── Usuario Admin ── */}
        <div style={SECTION_STYLE}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#fa7553", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>
            Usuario Administrador
          </div>

          <Field label="Nombre *">
            <input
              style={INPUT_STYLE}
              value={form.adminName}
              onChange={(e) => set("adminName", e.target.value)}
              placeholder="Carlos Gómez"
              required
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Email *">
              <input
                style={INPUT_STYLE}
                type="email"
                value={form.adminEmail}
                onChange={(e) => set("adminEmail", e.target.value)}
                placeholder="carlos@empresa.com"
                required
              />
            </Field>
            <Field label="Contraseña *">
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...INPUT_STYLE, paddingRight: 36 }}
                  type={showPass ? "text" : "password"}
                  value={form.adminPassword}
                  onChange={(e) => set("adminPassword", e.target.value)}
                  placeholder="mínimo 8 caracteres"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "#5a5575",
                    cursor: "pointer",
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </Field>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 7,
              fontSize: 13,
              color: "#f87171",
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Link href="/admin">
            <button
              type="button"
              style={{
                padding: "10px 20px",
                background: "transparent",
                border: "1px solid rgba(114,85,180,0.2)",
                borderRadius: 7,
                fontSize: 13.5,
                color: "#7a7590",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>
          </Link>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 24px",
              background: loading ? "rgba(43,9,111,0.4)" : "linear-gradient(135deg, #2b096f, #7255b4)",
              border: "none",
              borderRadius: 7,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#fff",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {loading ? "Creando..." : "Crear Cliente"}
          </button>
        </div>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
