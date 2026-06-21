"use client";

import { useState } from "react";
import { Settings, Users, Key, Bell, Building, Save, Eye, EyeOff, MessageSquare, X, Loader2 } from "lucide-react";
import ConfiguracionPanel from "@/components/bot/ConfiguracionPanel";

type Tab = "empresa" | "usuarios" | "integraciones" | "notificaciones" | "whatsapp";

interface Props {
  company: any;
  users: any[];
  currentUserId: string;
}

function InputField({ label, value, onChange, type = "text", placeholder, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all pr-10 disabled:opacity-50"
          style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.25)", color: "var(--color-text-primary)" }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin:      { label: "Admin",      color: "var(--color-coral)" },
  supervisor: { label: "Supervisor", color: "var(--color-warning)" },
  asesor:     { label: "Asesor",     color: "var(--color-lavender)" },
};

/* ─── Modal invitar usuario ─── */
function InviteUserModal({ onClose, onInvited }: { onClose: () => void; onInvited: (u: any) => void }) {
  const [form, setForm]     = useState({ name: "", email: "", password: "", userRole: "asesor" });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError("Todos los campos son obligatorios."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/company/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      onInvited(data);
    } catch (err: any) {
      setError(err.message || "Error al crear usuario.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.25)", color: "var(--color-text-primary)" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl animate-slide-up" style={{ background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)" }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
          <h2 className="font-bold" style={{ color: "var(--color-text-primary)" }}>Invitar usuario</h2>
          <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <InputField label="Nombre completo" value={form.name}     onChange={(v) => setForm(f => ({ ...f, name: v }))}     placeholder="Ana García" />
          <InputField label="Email"            value={form.email}    onChange={(v) => setForm(f => ({ ...f, email: v }))}    placeholder="ana@empresa.pe" />
          <InputField label="Contraseña"       value={form.password} onChange={(v) => setForm(f => ({ ...f, password: v }))} type="password" placeholder="Min. 8 caracteres" />
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Rol</label>
            <select value={form.userRole} onChange={(e) => setForm(f => ({ ...f, userRole: e.target.value }))}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>
              <option value="asesor">Asesor</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(90,85,117,0.15)", border: "1px solid rgba(90,85,117,0.3)", color: "var(--color-text-secondary)" }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: loading ? "rgba(114,85,180,0.4)" : "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", color: "var(--color-text-primary)" }}>
              {loading ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal editar usuario ─── */
function EditUserModal({ user, onClose, onUpdated }: { user: any; onClose: () => void; onUpdated: (u: any) => void }) {
  const [name,    setName]    = useState(user.name || "");
  const [role,    setRole]    = useState(user.role || "asesor");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const inputStyle = { background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.25)", color: "var(--color-text-primary)" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/company/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, userRole: role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      onUpdated(data);
    } catch (err: any) {
      setError(err.message || "Error al actualizar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-xl animate-slide-up" style={{ background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)" }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
          <h2 className="font-bold" style={{ color: "var(--color-text-primary)" }}>Editar usuario</h2>
          <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <InputField label="Nombre" value={name} onChange={setName} placeholder="Nombre completo" />
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Rol</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>
              <option value="asesor">Asesor</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Email: {user.email}</p>
          {error && <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(90,85,117,0.15)", border: "1px solid rgba(90,85,117,0.3)", color: "var(--color-text-secondary)" }}>Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: loading ? "rgba(114,85,180,0.4)" : "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", color: "var(--color-text-primary)" }}>
              {loading ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Componente principal ─── */
export default function ConfiguracionClient({ company, users: initialUsers, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("empresa");

  /* empresa */
  const [companyName,    setCompanyName]    = useState(company?.name    || "");
  const [companyWeb,     setCompanyWeb]     = useState((company as any)?.website || "");
  const [companyPhone,   setCompanyPhone]   = useState((company as any)?.phone   || "");
  const [companyAddress, setCompanyAddress] = useState((company as any)?.address || "");
  const [savingCompany,  setSavingCompany]  = useState(false);
  const [savedCompany,   setSavedCompany]   = useState(false);

  /* usuarios */
  const [users,        setUsers]        = useState<any[]>(initialUsers);
  const [showInvite,   setShowInvite]   = useState(false);
  const [editingUser,  setEditingUser]  = useState<any | null>(null);

  /* notificaciones */
  const [notifs,        setNotifs]       = useState([true, true, false, false]);
  const [savingNotifs,  setSavingNotifs] = useState(false);
  const [savedNotifs,   setSavedNotifs]  = useState(false);

  const tabs = [
    { id: "empresa"        as Tab, label: "Empresa",        icon: Building },
    { id: "usuarios"       as Tab, label: "Usuarios",       icon: Users },
    { id: "integraciones"  as Tab, label: "Integraciones",  icon: Key },
    { id: "notificaciones" as Tab, label: "Notificaciones", icon: Bell },
    { id: "whatsapp"       as Tab, label: "WhatsApp Bot",   icon: MessageSquare },
  ];

  async function saveCompany() {
    setSavingCompany(true);
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName, website: companyWeb, phone: companyPhone, address: companyAddress }),
      });
      if (res.ok) { setSavedCompany(true); setTimeout(() => setSavedCompany(false), 2500); }
    } finally {
      setSavingCompany(false);
    }
  }

  async function saveNotifications() {
    setSavingNotifs(true);
    try {
      await fetch("/api/company/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: notifs }),
      });
      setSavedNotifs(true); setTimeout(() => setSavedNotifs(false), 2500);
    } finally {
      setSavingNotifs(false);
    }
  }

  const NOTIF_ITEMS = [
    { label: "Resumen semanal por email",     desc: "Cada lunes recibe el resumen ejecutivo" },
    { label: "Alertas de fatiga de anuncios", desc: "Notificar cuando el CTR baje >20%" },
    { label: "Nuevos leads en tiempo real",   desc: "Push notification al llegar un lead" },
    { label: "Recordatorios de seguimiento",  desc: "Alertar leads sin contacto en 24h" },
  ];

  const btnStyle = { background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", color: "var(--color-text-primary)" };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onInvited={(u) => { setUsers((prev) => [...prev, u]); setShowInvite(false); }}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u));
            setEditingUser(null);
          }}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Configuración</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>Gestiona tu plataforma</p>
      </div>

      <div className="flex gap-1 flex-wrap" style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all"
              style={{ color: tab === t.id ? "var(--color-text-primary)" : "var(--color-text-secondary)", borderBottom: tab === t.id ? "2px solid var(--color-lavender)" : "2px solid transparent", marginBottom: -1 }}>
              <Icon size={13} />{t.label}
            </button>
          );
        })}
      </div>

      <div className={tab === "whatsapp" ? "w-full" : "max-w-2xl"}>

        {/* ─── EMPRESA ─── */}
        {tab === "empresa" && (
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--color-text-primary)" }}>Datos de la empresa</h3>
            <InputField label="Nombre de empresa" value={companyName}    onChange={setCompanyName}    placeholder="Mi Empresa S.A.C." />
            <InputField label="Sitio web"          value={companyWeb}     onChange={setCompanyWeb}     placeholder="https://miempresa.pe" />
            <InputField label="Teléfono"           value={companyPhone}   onChange={setCompanyPhone}   placeholder="+51 999 999 999" />
            <InputField label="Dirección"          value={companyAddress} onChange={setCompanyAddress} placeholder="Lima, Perú" />
            <button onClick={saveCompany} disabled={savingCompany}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
              style={btnStyle}>
              {savingCompany ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savedCompany ? "¡Guardado!" : savingCompany ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        )}

        {/* ─── USUARIOS ─── */}
        {tab === "usuarios" && (
          <div className="rounded-xl overflow-hidden"
            style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid rgba(114,85,180,0.12)" }}>
              <h3 className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>Usuarios del equipo</h3>
              <button onClick={() => setShowInvite(true)}
                className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all hover:opacity-80"
                style={{ background: "rgba(114,85,180,0.2)", border: "1px solid rgba(114,85,180,0.3)", color: "var(--color-lavender)" }}>
                + Invitar usuario
              </button>
            </div>
            <div>
              {users.map((user, i) => {
                const rc = ROLE_LABELS[user.role] || { label: user.role, color: "var(--color-text-secondary)" };
                return (
                  <div key={user.id} className="flex items-center gap-4 px-5 py-3.5"
                    style={{ borderBottom: i < users.length - 1 ? "1px solid rgba(114,85,180,0.08)" : "none" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))" }}>
                      <span className="text-xs font-bold text-white">{user.name?.charAt(0).toUpperCase() || "U"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{user.name}</p>
                      <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>{user.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `color-mix(in srgb, ${rc.color} 13%, transparent)`, color: rc.color }}>{rc.label}</span>
                    {user.id !== currentUserId && (
                      <button onClick={() => setEditingUser(user)} className="text-xs hover:opacity-80 transition-opacity"
                        style={{ color: "var(--color-lavender)" }}>Editar</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ─── INTEGRACIONES ─── */}
        {tab === "integraciones" && <IntegracionesTab />}

        {/* ─── WHATSAPP BOT ─── */}
        {tab === "whatsapp" && <ConfiguracionPanel />}

        {/* ─── NOTIFICACIONES ─── */}
        {tab === "notificaciones" && (
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "var(--color-text-primary)" }}>Preferencias de notificaciones</h3>
            {NOTIF_ITEMS.map((n, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "rgba(43,9,111,0.15)", border: "1px solid rgba(114,85,180,0.15)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{n.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>{n.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={notifs[i]}
                    onChange={(e) => setNotifs((prev) => prev.map((v, j) => j === i ? e.target.checked : v))} />
                  <div className="w-10 h-5 rounded-full transition-all peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:transition-all after:bg-white"
                    style={{ background: notifs[i] ? "var(--color-lavender)" : "rgba(114,85,180,0.3)" }} />
                </label>
              </div>
            ))}
            <button onClick={saveNotifications} disabled={savingNotifs}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-60"
              style={btnStyle}>
              {savingNotifs ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {savedNotifs ? "¡Preferencias guardadas!" : "Guardar preferencias"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Tab Integraciones separado para no inflar el componente ─── */
function IntegracionesTab() {
  const [apiKeys, setApiKeys] = useState({
    openai: "", metaToken: "", metaAccountId: "", whatsappToken: "", whatsappPhoneId: "", resend: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(apiKeys),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  const fields = [
    { label: "OpenAI API Key",        key: "openai"          as const, hint: "Para ALU.IA" },
    { label: "Meta Access Token",     key: "metaToken"       as const, hint: "Para campañas Meta Ads" },
    { label: "Meta Ad Account ID",    key: "metaAccountId"   as const, hint: "act_XXXXXXXXXX" },
    { label: "WhatsApp Token",        key: "whatsappToken"   as const, hint: "Para integración WhatsApp Business" },
    { label: "WhatsApp Phone ID",     key: "whatsappPhoneId" as const, hint: "ID del número de teléfono" },
    { label: "Resend API Key",        key: "resend"          as const, hint: "Para emails transaccionales" },
  ];

  return (
    <div className="space-y-4">
      {fields.map((f) => (
        <div key={f.key} className="rounded-xl p-4"
          style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
          <InputField label={f.label} value={apiKeys[f.key]}
            onChange={(v) => setApiKeys((prev) => ({ ...prev, [f.key]: v }))}
            type="password" placeholder={f.hint} />
        </div>
      ))}
      <button onClick={handleSave} disabled={saving}
        className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", color: "var(--color-text-primary)" }}>
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        {saved ? "¡Guardado!" : "Guardar integraciones"}
      </button>
    </div>
  );
}
