"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Building2, Shield, Settings2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

interface Props {
  user: { name: string; email: string };
}

export default function AdminTopBar({ user }: Props) {
  const pathname = usePathname();

  return (
    <div
      style={{
        background: "linear-gradient(90deg, var(--color-surface-1) 0%, var(--color-surface-2) 100%)",
        borderBottom: "1px solid rgba(250,117,83,0.2)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg, var(--color-coral), #c0442a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={14} color="#fff" />
            </div>
            <div>
              <span style={{ fontSize: 13, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.02em" }}>
                PORT<span style={{ color: "var(--color-coral)" }}>.</span>ALU
              </span>
              <span
                style={{
                  marginLeft: 6,
                  fontSize: 9,
                  fontWeight: 700,
                  color: "var(--color-coral)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: "rgba(250,117,83,0.12)",
                  border: "1px solid rgba(250,117,83,0.3)",
                  borderRadius: 4,
                  padding: "1px 5px",
                }}
              >
                ADMIN
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Link
              href="/admin"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 500,
                color: pathname === "/admin" ? "var(--color-text-primary)" : "var(--color-text-faint)",
                background: pathname === "/admin" ? "rgba(255,255,255,0.06)" : "transparent",
                textDecoration: "none",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              <Building2 size={13} />
              Clientes
            </Link>
            <Link
              href="/admin/config"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 10px",
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 500,
                color: pathname === "/admin/config" ? "var(--color-text-primary)" : "var(--color-text-faint)",
                background: pathname === "/admin/config" ? "rgba(255,255,255,0.06)" : "transparent",
                textDecoration: "none",
                transition: "color 0.15s, background 0.15s",
              }}
            >
              <Settings2 size={13} />
              Config. Global
            </Link>
          </nav>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ThemeToggle size={28} />
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-text-primary)" }}>{user.name}</div>
            <div style={{ fontSize: 10, color: "var(--color-text-muted)" }}>{user.email}</div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 6,
              fontSize: 12,
              color: "var(--color-text-faint)",
              cursor: "pointer",
              transition: "color 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-primary)")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "var(--color-text-faint)")}
          >
            <LogOut size={12} />
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
