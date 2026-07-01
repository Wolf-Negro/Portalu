"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Search, Plus, Download, Eye, Pencil, Trash2, X,
  Phone, Mail, Calendar, User, Check,
} from "lucide-react";
import { useRouter } from "next/navigation";

const STATUS_CONFIG = {
  nuevo:         { label: "Nuevo",          color: "var(--color-lavender)", bg: "rgba(114,85,180,0.15)" },
  contactado:    { label: "Contactado",      color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  en_seguimiento:{ label: "En seguimiento",  color: "var(--color-warning)", bg: "rgba(245,158,11,0.15)" },
  calificado:    { label: "Calificado",      color: "var(--color-success)", bg: "rgba(34,197,94,0.15)" },
  descartado:    { label: "Descartado",      color: "var(--color-danger)", bg: "rgba(239,68,68,0.15)" },
};

const ORIGIN_CONFIG: Record<string, { label: string; color: string }> = {
  meta_ads:  { label: "Meta Ads",    color: "var(--color-lavender)" },
  whatsapp:  { label: "WhatsApp",    color: "var(--color-success)" },
  formulario:{ label: "Formulario",  color: "#3b82f6" },
  landing:   { label: "Landing Page",color: "var(--color-coral)" },
  otros:     { label: "Otros",       color: "var(--color-text-secondary)" },
};

function Badge({ type, value }: { type: "status" | "origin"; value: string }) {
  const cfg =
    type === "status"
      ? STATUS_CONFIG[value as keyof typeof STATUS_CONFIG]
      : ORIGIN_CONFIG[value] || ORIGIN_CONFIG.otros;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ background: (cfg as any).bg || `${(cfg as any).color}22`, color: (cfg as any).color }}
    >
      {cfg.label}
    </span>
  );
}

interface Lead {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  origin: string;
  status: string;
  notes?: string | null;
  asesorId?: string | null;
  asesor?: { id: string; name: string | null } | null;
  createdAt: string | Date;
}

function LeadDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg rounded-xl p-6 animate-slide-up"
        style={{ background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)" }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>{lead.name}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge type="status" value={lead.status} />
              <Badge type="origin" value={lead.origin} />
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded" style={{ color: "var(--color-text-muted)" }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-3 mb-5">
          {lead.phone && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <Phone size={14} style={{ color: "var(--color-lavender)" }} />
              {lead.phone}
            </div>
          )}
          {lead.email && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <Mail size={14} style={{ color: "var(--color-lavender)" }} />
              {lead.email}
            </div>
          )}
          <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
            <Calendar size={14} style={{ color: "var(--color-lavender)" }} />
            Creado: {new Date(lead.createdAt).toLocaleDateString("es-PE")}
          </div>
          {lead.asesor && (
            <div className="flex items-center gap-2 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              <User size={14} style={{ color: "var(--color-lavender)" }} />
              Asesor: <span style={{ color: "var(--color-text-primary)" }}>{lead.asesor.name}</span>
            </div>
          )}
        </div>

        {lead.notes && (
          <div className="p-3 rounded-lg mb-4"
            style={{ background: "rgba(43,9,111,0.2)", border: "1px solid rgba(114,85,180,0.2)" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "var(--color-lavender)" }}>Notas</p>
            <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>{lead.notes}</p>
          </div>
        )}

        <div className="flex gap-2">
          {lead.phone && (
            <a
              href={`https://wa.me/${lead.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-lg text-sm font-medium text-center transition-all"
              style={{ background: "rgba(34,197,94,0.15)", color: "var(--color-success)", border: "1px solid rgba(34,197,94,0.3)" }}
            >
              WhatsApp
            </a>
          )}
          <button onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium"
            style={{ background: "rgba(114,85,180,0.15)", color: "var(--color-lavender)", border: "1px solid rgba(114,85,180,0.3)" }}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

interface CreateLeadModalProps {
  users: { id: string; name: string | null }[];
  onClose: () => void;
  onCreated: (lead: Lead) => void;
}

function CreateLeadModal({ users, onClose, onCreated }: CreateLeadModalProps) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", origin: "meta_ads", status: "nuevo",
    notes: "", asesorId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es obligatorio."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          asesorId: form.asesorId || null,
        }),
      });
      if (!res.ok) throw new Error("Error al crear lead");
      const lead = await res.json();
      onCreated(lead);
    } catch {
      setError("Error al crear el lead. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "var(--color-surface-glass)",
    border: "1px solid rgba(114,85,180,0.25)",
    color: "var(--color-text-primary)",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-xl animate-slide-up"
        style={{ background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)" }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
          <h2 className="font-bold" style={{ color: "var(--color-text-primary)" }}>Nuevo Lead</h2>
          <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>
              Nombre *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Carlos Mendoza"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Teléfono</label>
              <input
                value={form.phone}
                onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+51 999 999 999"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="correo@email.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Origen</label>
              <select
                value={form.origin}
                onChange={(e) => setForm(f => ({ ...f, origin: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              >
                {Object.entries(ORIGIN_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              >
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Asesor</label>
            <select
              value={form.asesorId}
              onChange={(e) => setForm(f => ({ ...f, asesorId: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            >
              <option value="">Sin asignar</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Notas</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Información relevante del lead..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-xs px-3 py-2 rounded-lg"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(90,85,117,0.15)", border: "1px solid rgba(90,85,117,0.3)", color: "var(--color-text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{
                background: loading ? "rgba(114,85,180,0.4)" : "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))",
                color: "var(--color-text-primary)",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "Creando..." : "Crear lead"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditLeadModal({ lead, users, onClose, onUpdated }: {
  lead: Lead;
  users: { id: string; name: string | null }[];
  onClose: () => void;
  onUpdated: (lead: Lead) => void;
}) {
  const [form, setForm] = useState({
    name: lead.name, phone: lead.phone || "", email: lead.email || "",
    origin: lead.origin, status: lead.status, notes: lead.notes || "",
    asesorId: lead.asesorId || "",
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const inputStyle = { background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.25)", color: "var(--color-text-primary)" };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre es obligatorio."); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, asesorId: form.asesorId || null }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated(updated);
    } catch {
      setError("Error al actualizar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md rounded-xl animate-slide-up"
        style={{ background: "var(--color-surface-2)", border: "1px solid rgba(114,85,180,0.3)" }}>
        <div className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
          <h2 className="font-bold" style={{ color: "var(--color-text-primary)" }}>Editar Lead</h2>
          <button onClick={onClose} style={{ color: "var(--color-text-muted)" }}><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Nombre *</label>
            <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Origen</label>
              <select value={form.origin} onChange={(e) => setForm(f => ({ ...f, origin: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>
                {Object.entries(ORIGIN_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Estado</label>
              <select value={form.status} onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Asesor</label>
            <select value={form.asesorId} onChange={(e) => setForm(f => ({ ...f, asesorId: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle}>
              <option value="">Sin asignar</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "var(--color-text-secondary)" }}>Notas</label>
            <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
          </div>
          {error && <p className="text-xs px-3 py-2 rounded-lg"
            style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm"
              style={{ background: "rgba(90,85,117,0.15)", border: "1px solid rgba(90,85,117,0.3)", color: "var(--color-text-secondary)" }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: loading ? "rgba(114,85,180,0.4)" : "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", color: "#ffffff" }}>
              {loading ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface Props {
  leads: Lead[];
  total: number;
  pageSize: number;
  users: { id: string; name: string | null; role: string }[];
  companyId: string;
}

export default function LeadsClient({ leads: initialLeads, total, pageSize, users, companyId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const hasMore = leads.length < total;

  async function loadMore() {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/leads?page=${nextPage}&pageSize=${pageSize}`);
      if (!res.ok) throw new Error("Error al cargar más leads");
      const data = await res.json();
      setLeads((prev) => [...prev, ...data.leads]);
      setPage(nextPage);
    } catch {
      // silently ignore, user can retry
    } finally {
      setLoadingMore(false);
    }
  }
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editLead,     setEditLead]     = useState<Lead | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        l.name.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(search);
      const matchStatus = !filterStatus || l.status === filterStatus;
      const matchOrigin = !filterOrigin || l.origin === filterOrigin;
      return matchSearch && matchStatus && matchOrigin;
    });
  }, [leads, search, filterStatus, filterOrigin]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(id: string) {
    await fetch(`/api/leads/${id}`, { method: "DELETE" });
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setDeleteConfirm(null);
    if (selectedLead?.id === id) setSelectedLead(null);
  }

  async function handleBulkStatus(status: string) {
    await Promise.all(
      [...selected].map((id) =>
        fetch(`/api/leads/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    setLeads((prev) =>
      prev.map((l) => selected.has(l.id) ? { ...l, status } : l)
    );
    setSelected(new Set());
  }

  function exportCSV() {
    const rows = [
      ["Nombre", "Teléfono", "Email", "Origen", "Estado", "Asesor", "Fecha"],
      ...filtered.map((l) => [
        l.name, l.phone || "", l.email || "",
        ORIGIN_CONFIG[l.origin]?.label || l.origin,
        STATUS_CONFIG[l.status as keyof typeof STATUS_CONFIG]?.label || l.status,
        l.asesor?.name || "",
        new Date(l.createdAt).toLocaleDateString("es-PE"),
      ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv, ], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `leads_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const inputStyle = {
    background: "var(--color-surface-glass)",
    border: "1px solid rgba(114,85,180,0.2)",
    color: "var(--color-text-primary)",
  } as React.CSSProperties;

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {selectedLead && <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />}
      {editLead && (
        <EditLeadModal
          lead={editLead}
          users={users}
          onClose={() => setEditLead(null)}
          onUpdated={(updated) => {
            setLeads((prev) => prev.map((l) => l.id === updated.id ? { ...l, ...updated } : l));
            setEditLead(null);
          }}
        />
      )}
      {showCreateModal && (
        <CreateLeadModal
          users={users}
          onClose={() => setShowCreateModal(false)}
          onCreated={(lead) => {
            setLeads((prev) => [lead, ...prev]);
            setShowCreateModal(false);
          }}
        />
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}>
          <div className="w-80 rounded-xl p-6"
            style={{ background: "var(--color-surface-2)", border: "1px solid rgba(239,68,68,0.3)" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--color-text-primary)" }}>¿Eliminar lead?</p>
            <p className="text-xs mb-5" style={{ color: "var(--color-text-secondary)" }}>Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-lg text-sm"
                style={{ background: "rgba(90,85,117,0.15)", border: "1px solid rgba(90,85,117,0.3)", color: "var(--color-text-secondary)" }}>
                Cancelar
              </button>
              <button onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold"
                style={{ background: "rgba(239,68,68,0.8)", color: "#fff" }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Leads</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {filtered.length} de {leads.length} leads
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: "linear-gradient(135deg, var(--color-violet-dim) 0%, var(--color-lavender) 100%)",
            color: "#ffffff",
            boxShadow: "0 4px 16px rgba(43,9,111,0.4)",
          }}
        >
          <Plus size={14} />
          Nuevo lead
        </button>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-48 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--color-text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, email, teléfono..."
            className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none"
            style={inputStyle}
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        <select
          value={filterOrigin}
          onChange={(e) => setFilterOrigin(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm outline-none"
          style={inputStyle}
        >
          <option value="">Todos los orígenes</option>
          {Object.entries(ORIGIN_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1.5 rounded-lg"
              style={{ background: "rgba(114,85,180,0.15)", color: "var(--color-lavender)" }}>
              {selected.size} sel.
            </span>
            <select
              onChange={(e) => e.target.value && handleBulkStatus(e.target.value)}
              defaultValue=""
              className="px-2 py-1.5 rounded-lg text-xs outline-none"
              style={inputStyle}
            >
              <option value="" disabled>Cambiar estado...</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button
              onClick={() => setSelected(new Set())}
              className="p-1.5 rounded"
              style={{ color: "var(--color-text-muted)" }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
          style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.2)", color: "var(--color-text-secondary)" }}
        >
          <Download size={14} />
          CSV
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden"
        style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(filtered.map((l) => l.id)));
                      else setSelected(new Set());
                    }}
                    checked={selected.size === filtered.length && filtered.length > 0}
                    className="accent-violet-500"
                  />
                </th>
                {["Nombre", "Teléfono", "Email", "Origen", "Estado", "Asesor", "Fecha", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead, i) => (
                <tr
                  key={lead.id}
                  className="table-row-hover transition-colors group"
                  style={{
                    background: selected.has(lead.id) ? "rgba(43,9,111,0.2)" : "transparent",
                    borderBottom: i < filtered.length - 1 ? "1px solid rgba(114,85,180,0.08)" : "none",
                  }}
                >
                  <td className="px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      className="accent-violet-500"
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", color: "#ffffff" }}>
                        {lead.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{lead.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5" style={{ color: "var(--color-text-secondary)" }}>{lead.phone || "—"}</td>
                  <td className="px-4 py-3.5 max-w-[160px] truncate" style={{ color: "var(--color-text-secondary)" }}>
                    {lead.email || "—"}
                  </td>
                  <td className="px-4 py-3.5"><Badge type="origin" value={lead.origin} /></td>
                  <td className="px-4 py-3.5"><Badge type="status" value={lead.status} /></td>
                  <td className="px-4 py-3.5" style={{ color: "var(--color-text-secondary)" }}>
                    {lead.asesor?.name || <span style={{ color: "var(--color-text-muted)" }}>Sin asignar</span>}
                  </td>
                  <td className="px-4 py-3.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(lead.createdAt).toLocaleDateString("es-PE")}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setSelectedLead(lead)}
                        className="p-1.5 rounded-md transition-colors hover:bg-violet-500/10"
                        style={{ color: "var(--color-lavender)" }}
                        title="Ver detalle"
                      >
                        <Eye size={14} />
                      </button>
                      <button
                        onClick={() => setEditLead(lead)}
                        className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                        style={{ color: "var(--color-text-secondary)" }}
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(lead.id)}
                        className="p-1.5 rounded-md transition-colors hover:bg-red-500/10"
                        style={{ color: "var(--color-danger)" }}
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(114,85,180,0.1)", border: "1px solid rgba(114,85,180,0.2)" }}>
                        <Search size={16} style={{ color: "var(--color-text-muted)" }} />
                      </div>
                      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>No se encontraron leads con los filtros actuales</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
            style={{ background: "rgba(114,85,180,0.15)", color: "var(--color-lavender)", border: "1px solid rgba(114,85,180,0.3)" }}
          >
            {loadingMore ? "Cargando..." : `Cargar más (${leads.length} de ${total})`}
          </button>
        </div>
      )}
    </div>
  );
}
