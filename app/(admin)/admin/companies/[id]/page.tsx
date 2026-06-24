"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, UserPlus, CheckCircle2, XCircle, Eye, EyeOff, ImagePlus, Building2, Trash2, AlertTriangle } from "lucide-react";

const INPUT_STYLE: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(114,85,180,0.2)",
  borderRadius: 7,
  fontSize: 13.5,
  color: "var(--color-text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--color-text-faint)",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  display: "block",
  marginBottom: 6,
};

const SECTION_STYLE: React.CSSProperties = {
  background: "var(--color-surface-glass)",
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

interface CompanyDetail {
  id: string;
  name: string;
  website: string | null;
  phone: string | null;
  plan: string;
  active: boolean;
  logo: string | null;
  metaAdAccountId: string | null;
  hasOwnToken: boolean;
  users: { id: string; name: string; email: string; role: string; createdAt: string }[];
  leadCount: number;
  opportunityCount: number;
}

const ROLE_LABELS: Record<string, string> = { admin: "Admin", supervisor: "Supervisor", asesor: "Asesor" };

export default function EditCompanyPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  const [company, setCompany] = useState<CompanyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [useOwnToken, setUseOwnToken] = useState(false);
  const [newToken, setNewToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Cuentas publicitarias de Meta adicionales (la primaria vive en form.metaAdAccountId)
  const [metaAccounts, setMetaAccounts] = useState<{ id: string; accountId: string; label: string | null }[]>([]);
  const [newAccountId, setNewAccountId] = useState("");
  const [newAccountLabel, setNewAccountLabel] = useState("");
  const [newAccountToken, setNewAccountToken] = useState("");
  const [addingAccount, setAddingAccount] = useState(false);
  const [accountsError, setAccountsError] = useState("");

  // New user form
  const [showUserForm, setShowUserForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "asesor" });
  const [addingUser, setAddingUser] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [form, setForm] = useState({
    name: "",
    website: "",
    phone: "",
    plan: "starter",
    metaAdAccountId: "",
  });

  useEffect(() => {
    fetch(`/api/admin/companies/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const c = d.company;
        setCompany(c);
        setForm({
          name: c.name,
          website: c.website || "",
          phone: c.phone || "",
          plan: c.plan,
          metaAdAccountId: c.metaAdAccountId || "",
        });
        setUseOwnToken(c.hasOwnToken);
        setLogoPreview(c.logo || null);
        setLoading(false);
      });
    loadMetaAccounts();
  }, [id]);

  function loadMetaAccounts() {
    fetch(`/api/admin/companies/${id}/meta-accounts`)
      .then((r) => r.json())
      .then((d) => setMetaAccounts(d.accounts ?? []))
      .catch(() => {});
  }

  async function handleAddMetaAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!newAccountId.trim()) return;
    setAddingAccount(true);
    setAccountsError("");
    const res = await fetch(`/api/admin/companies/${id}/meta-accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId: newAccountId.trim(),
        label: newAccountLabel.trim() || undefined,
        accessToken: newAccountToken.trim() || undefined,
      }),
    });
    setAddingAccount(false);
    if (res.ok) {
      setNewAccountId("");
      setNewAccountLabel("");
      setNewAccountToken("");
      loadMetaAccounts();
    } else {
      const d = await res.json().catch(() => ({}));
      setAccountsError(d.error || "Error al agregar la cuenta");
    }
  }

  async function handleRemoveMetaAccount(accountRowId: string) {
    await fetch(`/api/admin/companies/${id}/meta-accounts`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountRowId }),
    });
    loadMetaAccounts();
  }

  function set(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const fd = new FormData();
    fd.append("logo", file);
    const res = await fetch(`/api/admin/companies/${id}/logo`, { method: "POST", body: fd });
    const data = await res.json();
    setUploadingLogo(false);
    if (res.ok) {
      setLogoPreview(data.logoUrl + "?t=" + Date.now());
      setSuccess("Logo actualizado");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(data.error || "Error al subir logo");
    }
    e.target.value = "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const body: any = { ...form };
    if (newToken) body.metaAccessToken = newToken;
    else if (!useOwnToken) body.metaAccessToken = null;

    const res = await fetch(`/api/admin/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    setSaving(false);
    if (res.ok) {
      setSuccess("Guardado correctamente");
      setNewToken("");
      setCompany((prev) => prev ? { ...prev, ...form, hasOwnToken: useOwnToken || !!newToken } : prev);
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const d = await res.json();
      setError(d.error || "Error al guardar");
    }
  }

  async function toggleActive() {
    if (!company) return;
    const res = await fetch(`/api/admin/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !company.active }),
    });
    if (res.ok) setCompany((prev) => prev ? { ...prev, active: !prev.active } : prev);
  }

  async function handleDelete() {
    if (!company) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/companies/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: deleteConfirmText }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteError(d.error || "No se pudo borrar la empresa.");
        return;
      }
      router.push("/admin");
    } catch {
      setDeleteError("Error de red al borrar la empresa.");
    } finally {
      setDeleting(false);
    }
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAddingUser(true);
    const res = await fetch(`/api/admin/companies/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newUser),
    });
    setAddingUser(false);
    if (res.ok) {
      const d = await res.json();
      setCompany((prev) => prev ? { ...prev, users: [...prev.users, { ...d.user, createdAt: new Date().toISOString() }] } : prev);
      setNewUser({ name: "", email: "", password: "", role: "asesor" });
      setShowUserForm(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "80px 0", gap: 10, color: "var(--color-text-muted)" }}>
        <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
        Cargando...
      </div>
    );
  }

  if (!company) return <div style={{ color: "#f87171", padding: 24 }}>Empresa no encontrada</div>;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      <Link href="/admin" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--color-text-faint)", textDecoration: "none", marginBottom: 24 }}>
        <ArrowLeft size={14} /> Volver a clientes
      </Link>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: "var(--color-text-primary)", margin: 0, letterSpacing: "-0.03em" }}>{company.name}</h1>
          <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0" }}>
            {company.leadCount} leads · {company.opportunityCount} oportunidades
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={toggleActive}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: company.active ? "rgba(239,68,68,0.08)" : "rgba(34,197,94,0.08)",
              border: `1px solid ${company.active ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)"}`,
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: company.active ? "#f87171" : "#4ade80",
              cursor: "pointer",
            }}
          >
            {company.active ? <XCircle size={13} /> : <CheckCircle2 size={13} />}
            {company.active ? "Desactivar empresa" : "Activar empresa"}
          </button>
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteConfirmText(""); setDeleteError(""); }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "7px 14px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 7,
              fontSize: 12.5,
              fontWeight: 600,
              color: "#f87171",
              cursor: "pointer",
            }}
          >
            <Trash2 size={13} />
            Borrar definitivamente
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteModal(false); }}
        >
          <div style={{ background: "var(--color-surface-card)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 14, padding: 28, maxWidth: 440, width: "90%" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
              <AlertTriangle size={20} style={{ color: "#f87171", flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 6px" }}>
                  Borrar "{company.name}" definitivamente
                </h3>
                <p style={{ fontSize: 12.5, color: "var(--color-text-muted)", margin: 0, lineHeight: 1.5 }}>
                  Esto elimina permanentemente la empresa, sus usuarios, leads, oportunidades, campañas y todo su
                  historial de WhatsApp. <strong style={{ color: "#f87171" }}>No se puede deshacer.</strong>
                </p>
              </div>
            </div>

            <label style={{ ...LABEL_STYLE, marginTop: 4 }}>
              Escribe <strong>{company.name}</strong> para confirmar
            </label>
            <input
              style={INPUT_STYLE}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={company.name}
              autoComplete="off"
            />

            {deleteError && (
              <p style={{ fontSize: 12, color: "#f87171", marginTop: 10 }}>{deleteError}</p>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 20, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ padding: "8px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 7, fontSize: 12.5, color: "var(--color-text-muted)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmText !== company.name}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "8px 16px",
                  background: deleteConfirmText === company.name ? "linear-gradient(135deg, #b91c1c, #ef4444)" : "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 7, fontSize: 12.5, fontWeight: 600,
                  color: deleteConfirmText === company.name ? "#fff" : "var(--color-text-muted)",
                  cursor: deleteConfirmText === company.name ? "pointer" : "not-allowed",
                }}
              >
                {deleting ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <Trash2 size={12} />}
                {deleting ? "Borrando..." : "Borrar definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Logo ── */}
      <div style={{ ...SECTION_STYLE, display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{ width: 72, height: 72, borderRadius: 14, background: "var(--color-violet-dim)", border: "1px solid rgba(114,85,180,0.2)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
          {logoPreview ? (
            <img src={logoPreview} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <Building2 size={28} color="#3a3550" />
          )}
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)", marginBottom: 4 }}>Logo de la empresa</div>
          <div style={{ fontSize: 11.5, color: "var(--color-text-muted)", marginBottom: 10 }}>PNG, JPG, SVG o WEBP · Máx. 2MB</div>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", background: "rgba(114,85,180,0.1)", border: "1px solid rgba(114,85,180,0.25)", borderRadius: 7, fontSize: 12, fontWeight: 600, color: "var(--color-violet-soft)", cursor: "pointer" }}>
            {uploadingLogo ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} /> : <ImagePlus size={12} />}
            {uploadingLogo ? "Subiendo..." : "Subir logo"}
            <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: "none" }} disabled={uploadingLogo} />
          </label>
        </div>
      </div>

      <form onSubmit={handleSave}>
        {/* ── Empresa ── */}
        <div style={SECTION_STYLE}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-coral)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>Empresa</div>

          <Field label="Nombre *">
            <input style={INPUT_STYLE} value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Website">
              <input style={INPUT_STYLE} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
            </Field>
            <Field label="Teléfono">
              <input style={INPUT_STYLE} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+51 ..." />
            </Field>
          </div>
          <Field label="Plan">
            <select style={{ ...INPUT_STYLE, cursor: "pointer" }} value={form.plan} onChange={(e) => set("plan", e.target.value)}>
              <option value="starter">Starter — básico</option>
              <option value="pro">Pro — avanzado</option>
              <option value="agency">Agency — completo</option>
            </select>
          </Field>
        </div>

        {/* ── Meta Ads ── */}
        <div style={SECTION_STYLE}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-coral)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 18 }}>Meta Ads</div>

          <div style={{ marginBottom: 18 }}>
            <label style={LABEL_STYLE}>Tipo de acceso</label>
            <div style={{ display: "flex", gap: 12 }}>
              {[
                { value: false, label: "Token general de Alucinando" },
                { value: true, label: "Token propio del cliente" },
              ].map((opt) => (
                <label
                  key={String(opt.value)}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    borderRadius: 7,
                    border: `1px solid ${useOwnToken === opt.value ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.15)"}`,
                    background: useOwnToken === opt.value ? "rgba(43,9,111,0.2)" : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: useOwnToken === opt.value ? "#c4bcde" : "var(--color-text-faint)",
                  }}
                >
                  <input type="radio" checked={useOwnToken === opt.value} onChange={() => setUseOwnToken(opt.value)} style={{ accentColor: "var(--color-lavender)" }} />
                  {opt.label}
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
            <Field label={`Token de acceso ${company.hasOwnToken ? "(configurado — deja vacío para no cambiar)" : ""}`}>
              <div style={{ position: "relative" }}>
                <input
                  style={{ ...INPUT_STYLE, paddingRight: 36, fontFamily: "monospace", fontSize: 12 }}
                  type={showToken ? "text" : "password"}
                  value={newToken}
                  onChange={(e) => setNewToken(e.target.value)}
                  placeholder={company.hasOwnToken ? "••••••••••••••••••" : "EAAxxxxxxxxxxxxxxx..."}
                />
                <button type="button" onClick={() => setShowToken(!showToken)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}>
                  {showToken ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </Field>
          )}

          <div style={{ marginTop: 22, paddingTop: 18, borderTop: "1px solid rgba(114,85,180,0.12)" }}>
            <label style={LABEL_STYLE}>Cuentas publicitarias adicionales</label>
            <p style={{ fontSize: 11.5, color: "var(--color-text-faint)", margin: "0 0 12px" }}>
              Si esta empresa anuncia desde más de una cuenta de Meta Ads, agrégalas aquí. El Dashboard,
              Campañas y ALU.IA combinarán los datos de todas automáticamente.
            </p>

            {metaAccounts.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                {metaAccounts.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "8px 12px", borderRadius: 7,
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(114,85,180,0.12)",
                    }}
                  >
                    <div style={{ fontSize: 12.5 }}>
                      <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{a.label || "Sin nombre"}</span>
                      <span style={{ color: "var(--color-text-faint)", marginLeft: 8, fontFamily: "monospace" }}>{a.accountId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMetaAccount(a.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)" }}
                      title="Quitar cuenta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.4fr auto", gap: 8, alignItems: "start" }}>
              <input
                style={INPUT_STYLE}
                value={newAccountId}
                onChange={(e) => setNewAccountId(e.target.value)}
                placeholder="ID de cuenta (sin act_)"
              />
              <input
                style={INPUT_STYLE}
                value={newAccountLabel}
                onChange={(e) => setNewAccountLabel(e.target.value)}
                placeholder="Nombre (opcional)"
              />
              <input
                style={{ ...INPUT_STYLE, fontFamily: "monospace", fontSize: 12 }}
                value={newAccountToken}
                onChange={(e) => setNewAccountToken(e.target.value)}
                placeholder="Token propio (opcional, usa el de la empresa si está vacío)"
              />
              <button
                type="button"
                onClick={handleAddMetaAccount}
                disabled={addingAccount || !newAccountId.trim()}
                style={{
                  padding: "9px 16px", borderRadius: 7, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,var(--color-violet-dim),var(--color-lavender))",
                  color: "#fff", fontSize: 12.5, fontWeight: 600,
                  opacity: addingAccount || !newAccountId.trim() ? 0.5 : 1,
                }}
              >
                + Agregar
              </button>
            </div>
            {accountsError && (
              <div style={{ fontSize: 11.5, color: "#f87171", marginTop: 6 }}>{accountsError}</div>
            )}
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, fontSize: 13, color: "#f87171", marginBottom: 18 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: "10px 14px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", borderRadius: 7, fontSize: 13, color: "#4ade80", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={14} /> {success}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32 }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 24px",
              background: saving ? "rgba(43,9,111,0.4)" : "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))",
              border: "none", borderRadius: 7, fontSize: 13.5, fontWeight: 600, color: "#fff",
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}
          >
            {saving && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>

      {/* ── Usuarios ── */}
      <div style={SECTION_STYLE}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--color-coral)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Usuarios ({company.users.length})
          </div>
          <button
            onClick={() => setShowUserForm(!showUserForm)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "6px 12px",
              background: showUserForm ? "rgba(114,85,180,0.2)" : "rgba(114,85,180,0.08)",
              border: "1px solid rgba(114,85,180,0.25)",
              borderRadius: 6, fontSize: 12, fontWeight: 600, color: "var(--color-violet-soft)", cursor: "pointer",
            }}
          >
            <UserPlus size={12} />
            Agregar usuario
          </button>
        </div>

        {/* Add user form */}
        {showUserForm && (
          <form onSubmit={addUser} style={{ background: "rgba(43,9,111,0.1)", border: "1px solid rgba(114,85,180,0.2)", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={LABEL_STYLE}>Nombre *</label>
                <input style={INPUT_STYLE} value={newUser.name} onChange={(e) => setNewUser((p) => ({ ...p, name: e.target.value }))} required placeholder="Nombre completo" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Email *</label>
                <input style={INPUT_STYLE} type="email" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} required placeholder="email@empresa.com" />
              </div>
              <div>
                <label style={LABEL_STYLE}>Contraseña *</label>
                <div style={{ position: "relative" }}>
                  <input style={{ ...INPUT_STYLE, paddingRight: 34 }} type={showNewPass ? "text" : "password"} value={newUser.password} onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))} required minLength={8} placeholder="mínimo 8 caracteres" />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}>
                    {showNewPass ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={LABEL_STYLE}>Rol</label>
                <select style={{ ...INPUT_STYLE, cursor: "pointer" }} value={newUser.role} onChange={(e) => setNewUser((p) => ({ ...p, role: e.target.value }))}>
                  <option value="admin">Admin</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="asesor">Asesor</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setShowUserForm(false)} style={{ padding: "7px 14px", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, fontSize: 12.5, color: "var(--color-text-faint)", cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={addingUser} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", border: "none", borderRadius: 6, fontSize: 12.5, fontWeight: 600, color: "#fff", cursor: "pointer" }}>
                {addingUser && <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />}
                {addingUser ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        )}

        {/* Users list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {company.users.map((u) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(114,85,180,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)" }}>{u.name}</div>
                  <div style={{ fontSize: 11.5, color: "var(--color-text-muted)" }}>{u.email}</div>
                </div>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 20,
                color: u.role === "admin" ? "var(--color-coral)" : u.role === "supervisor" ? "var(--color-violet-soft)" : "var(--color-text-faint)",
                background: u.role === "admin" ? "rgba(250,117,83,0.1)" : u.role === "supervisor" ? "rgba(114,85,180,0.12)" : "rgba(255,255,255,0.05)",
                border: `1px solid ${u.role === "admin" ? "rgba(250,117,83,0.25)" : u.role === "supervisor" ? "rgba(114,85,180,0.25)" : "rgba(255,255,255,0.08)"}`,
              }}>
                {ROLE_LABELS[u.role] || u.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
