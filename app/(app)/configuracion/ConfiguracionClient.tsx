"use client";

import { useState } from "react";
import { Settings, Users, Key, Bell, Building, Save, Eye, EyeOff } from "lucide-react";

type Tab = "empresa" | "usuarios" | "integraciones" | "notificaciones";

interface Props {
  company: any;
  users: any[];
  currentUserId: string;
}

function InputField({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "#a09bbf" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={isPassword && !show ? "password" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2.5 rounded-lg text-sm outline-none transition-all pr-10"
          style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.25)", color: "#e9e8e6" }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(!show)}
            className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "#5a5575" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "Admin", color: "#fa7553" },
  supervisor: { label: "Supervisor", color: "#f59e0b" },
  asesor: { label: "Asesor", color: "#7255b4" },
};

export default function ConfiguracionClient({ company, users, currentUserId }: Props) {
  const [tab, setTab] = useState<Tab>("empresa");
  const [companyName, setCompanyName] = useState(company?.name || "");
  const [apiKeys, setApiKeys] = useState({
    openai: "",
    metaToken: "",
    metaAccountId: "",
    whatsappToken: "",
    whatsappPhoneId: "",
    resend: "",
  });

  const tabs = [
    { id: "empresa" as Tab, label: "Empresa", icon: Building },
    { id: "usuarios" as Tab, label: "Usuarios", icon: Users },
    { id: "integraciones" as Tab, label: "Integraciones", icon: Key },
    { id: "notificaciones" as Tab, label: "Notificaciones", icon: Bell },
  ];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#e9e8e6" }}>Configuración</h1>
        <p className="text-sm mt-0.5" style={{ color: "#a09bbf" }}>Gestiona tu plataforma</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                color: tab === t.id ? "#e9e8e6" : "#a09bbf",
                borderBottom: tab === t.id ? "2px solid #7255b4" : "2px solid transparent",
                marginBottom: -1,
              }}
            >
              <Icon size={13} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="max-w-2xl">
        {tab === "empresa" && (
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "#e9e8e6" }}>Datos de la empresa</h3>
            <InputField label="Nombre de empresa" value={companyName} onChange={setCompanyName} placeholder="Mi Empresa S.A.C." />
            <InputField label="Sitio web" value="" onChange={() => {}} placeholder="https://miempresa.pe" />
            <InputField label="Teléfono" value="" onChange={() => {}} placeholder="+51 999 999 999" />
            <InputField label="Dirección" value="" onChange={() => {}} placeholder="Lima, Perú" />
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all"
              style={{ background: "linear-gradient(135deg, #2b096f, #7255b4)", color: "#e9e8e6" }}>
              <Save size={14} />
              Guardar cambios
            </button>
          </div>
        )}

        {tab === "usuarios" && (
          <div className="rounded-xl overflow-hidden"
            style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: "1px solid rgba(114,85,180,0.12)" }}>
              <h3 className="font-semibold text-sm" style={{ color: "#e9e8e6" }}>Usuarios del equipo</h3>
              <button className="text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all"
                style={{ background: "rgba(114,85,180,0.2)", border: "1px solid rgba(114,85,180,0.3)", color: "#7255b4" }}>
                + Invitar usuario
              </button>
            </div>
            <div>
              {users.map((user, i) => {
                const roleConfig = ROLE_LABELS[user.role] || { label: user.role, color: "#a09bbf" };
                return (
                  <div key={user.id} className="flex items-center gap-4 px-5 py-3.5"
                    style={{ borderBottom: i < users.length - 1 ? "1px solid rgba(114,85,180,0.08)" : "none" }}>
                    <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #2b096f, #7255b4)" }}>
                      <span className="text-xs font-bold text-white">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium" style={{ color: "#e9e8e6" }}>{user.name}</p>
                      <p className="text-xs" style={{ color: "#5a5575" }}>{user.email}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: `${roleConfig.color}22`, color: roleConfig.color }}>
                      {roleConfig.label}
                    </span>
                    {user.id !== currentUserId && (
                      <button className="text-xs" style={{ color: "#5a5575" }}>Editar</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "integraciones" && (
          <div className="space-y-4">
            {[
              { label: "OpenAI API Key", key: "openai" as keyof typeof apiKeys, hint: "Para ALU.IA" },
              { label: "Meta Access Token", key: "metaToken" as keyof typeof apiKeys, hint: "Para campañas Meta Ads" },
              { label: "Meta Ad Account ID", key: "metaAccountId" as keyof typeof apiKeys, hint: "act_XXXXXXXXXX" },
              { label: "WhatsApp Token", key: "whatsappToken" as keyof typeof apiKeys, hint: "Para integración WhatsApp Business" },
              { label: "WhatsApp Phone ID", key: "whatsappPhoneId" as keyof typeof apiKeys, hint: "ID del número de teléfono" },
              { label: "Resend API Key", key: "resend" as keyof typeof apiKeys, hint: "Para emails transaccionales" },
            ].map((f) => (
              <div key={f.key} className="rounded-xl p-4"
                style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
                <InputField
                  label={f.label}
                  value={apiKeys[f.key]}
                  onChange={(v) => setApiKeys((prev) => ({ ...prev, [f.key]: v }))}
                  type="password"
                  placeholder={f.hint}
                />
              </div>
            ))}
            <button className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium"
              style={{ background: "linear-gradient(135deg, #2b096f, #7255b4)", color: "#e9e8e6" }}>
              <Save size={14} />
              Guardar integraciones
            </button>
          </div>
        )}

        {tab === "notificaciones" && (
          <div className="rounded-xl p-5 space-y-4"
            style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
            <h3 className="font-semibold text-sm mb-4" style={{ color: "#e9e8e6" }}>Preferencias de notificaciones</h3>
            {[
              { label: "Resumen semanal por email", desc: "Cada lunes recibe el resumen ejecutivo" },
              { label: "Alertas de fatiga de anuncios", desc: "Notificar cuando el CTR baje >20%" },
              { label: "Nuevos leads en tiempo real", desc: "Push notification al llegar un lead" },
              { label: "Recordatorios de seguimiento", desc: "Alertar leads sin contacto en 24h" },
            ].map((n, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg"
                style={{ background: "rgba(43,9,111,0.15)", border: "1px solid rgba(114,85,180,0.15)" }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: "#e9e8e6" }}>{n.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#5a5575" }}>{n.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={i < 2} />
                  <div className="w-10 h-5 rounded-full transition-all peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:transition-all after:bg-white"
                    style={{ background: "rgba(114,85,180,0.3)" }} />
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
