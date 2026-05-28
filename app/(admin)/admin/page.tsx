"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Building2,
  Users,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Pencil,
  Loader2,
} from "lucide-react";

interface Company {
  id: string;
  name: string;
  website: string | null;
  plan: string;
  active: boolean;
  metaAdAccountId: string | null;
  hasOwnToken: boolean;
  userCount: number;
  leadCount: number;
  createdAt: string;
}

const PLAN_STYLES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  starter: { label: "Starter", color: "#a09bbf", bg: "rgba(160,155,191,0.1)", border: "rgba(160,155,191,0.2)" },
  pro:     { label: "Pro",     color: "#9b82d4", bg: "rgba(114,85,180,0.15)", border: "rgba(114,85,180,0.35)" },
  agency:  { label: "Agency",  color: "#fa7553", bg: "rgba(250,117,83,0.12)", border: "rgba(250,117,83,0.3)" },
};

export default function AdminPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/companies")
      .then((r) => r.json())
      .then((d) => {
        setCompanies(d.companies || []);
        setLoading(false);
      });
  }, []);

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/admin/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !current }),
    });
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, active: !current } : c)));
  }

  const active = companies.filter((c) => c.active).length;
  const agency = companies.filter((c) => c.plan === "agency").length;
  const pro = companies.filter((c) => c.plan === "pro").length;

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e9e8e6", letterSpacing: "-0.03em", margin: 0 }}>
            Clientes
          </h1>
          <p style={{ fontSize: 13, color: "#5a5575", margin: "4px 0 0" }}>
            Gestiona empresas, credenciales Meta y accesos
          </p>
        </div>
        <Link href="/admin/companies/new">
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "9px 18px",
              background: "linear-gradient(135deg, #2b096f, #7255b4)",
              border: "none",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <Plus size={14} />
            Nuevo Cliente
          </button>
        </Link>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        {[
          { label: "Total clientes", value: companies.length, icon: <Building2 size={16} />, color: "#7255b4" },
          { label: "Activos", value: active, icon: <CheckCircle2 size={16} />, color: "#22c55e" },
          { label: "Plan Agency", value: agency, icon: <TrendingUp size={16} />, color: "#fa7553" },
          { label: "Plan Pro", value: pro, icon: <Users size={16} />, color: "#9b82d4" },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: "rgba(20,20,36,0.7)",
              border: "1px solid rgba(114,85,180,0.15)",
              borderRadius: 10,
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: `${s.color}18`,
                border: `1px solid ${s.color}30`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: s.color,
                flexShrink: 0,
              }}
            >
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#e9e8e6", lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11.5, color: "#5a5575", marginTop: 3 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        style={{
          background: "rgba(14,14,28,0.8)",
          border: "1px solid rgba(114,85,180,0.15)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 90px 200px 110px 70px 80px",
            padding: "11px 20px",
            borderBottom: "1px solid rgba(114,85,180,0.12)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {["Empresa", "Plan", "Meta Account ID", "Token", "Estado", ""].map((h) => (
            <div key={h} style={{ fontSize: 11, fontWeight: 700, color: "#5a5575", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {h}
            </div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "48px 0", color: "#5a5575", fontSize: 13 }}>
            <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
            Cargando...
          </div>
        ) : companies.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#5a5575", fontSize: 13 }}>
            No hay clientes aún.{" "}
            <Link href="/admin/companies/new" style={{ color: "#9b82d4" }}>
              Crea el primero
            </Link>
          </div>
        ) : (
          companies.map((c, i) => {
            const plan = PLAN_STYLES[c.plan] || PLAN_STYLES.starter;
            return (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 90px 200px 110px 70px 80px",
                  padding: "14px 20px",
                  alignItems: "center",
                  borderBottom: i < companies.length - 1 ? "1px solid rgba(114,85,180,0.08)" : "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.02)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "transparent")}
              >
                {/* Name */}
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e9e8e6" }}>{c.name}</div>
                  <div style={{ fontSize: 11.5, color: "#5a5575", marginTop: 2 }}>
                    {c.userCount} usuario{c.userCount !== 1 ? "s" : ""} · {c.leadCount} leads
                  </div>
                </div>

                {/* Plan */}
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "3px 8px",
                      borderRadius: 20,
                      color: plan.color,
                      background: plan.bg,
                      border: `1px solid ${plan.border}`,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {plan.label}
                  </span>
                </div>

                {/* Meta Account */}
                <div style={{ fontSize: 12.5, fontFamily: "monospace" }}>
                  {c.metaAdAccountId ? (
                    <span style={{ color: "#a09bbf" }}>
                      {c.metaAdAccountId.length > 22 ? c.metaAdAccountId.slice(0, 22) + "…" : c.metaAdAccountId}
                    </span>
                  ) : (
                    <span style={{ color: "#3a3550", fontStyle: "italic", fontFamily: "inherit", fontSize: 12 }}>No configurado</span>
                  )}
                </div>

                {/* Token */}
                <div>
                  {c.hasOwnToken ? (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 20,
                        color: "#fa7553",
                        background: "rgba(250,117,83,0.1)",
                        border: "1px solid rgba(250,117,83,0.25)",
                      }}
                    >
                      Propio
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "3px 8px",
                        borderRadius: 20,
                        color: "#9b82d4",
                        background: "rgba(114,85,180,0.12)",
                        border: "1px solid rgba(114,85,180,0.25)",
                      }}
                    >
                      General
                    </span>
                  )}
                </div>

                {/* Active toggle */}
                <div>
                  <button
                    onClick={() => toggleActive(c.id, c.active)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: 12,
                      color: c.active ? "#22c55e" : "#5a5575",
                      transition: "color 0.2s",
                    }}
                    title={c.active ? "Desactivar" : "Activar"}
                  >
                    {c.active ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    {c.active ? "Activo" : "Inactivo"}
                  </button>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <Link href={`/admin/companies/${c.id}`}>
                    <button
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "5px 10px",
                        background: "rgba(114,85,180,0.1)",
                        border: "1px solid rgba(114,85,180,0.2)",
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 500,
                        color: "#9b82d4",
                        cursor: "pointer",
                        transition: "background 0.15s",
                      }}
                    >
                      <Pencil size={11} />
                      Editar
                    </button>
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
