"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Megaphone,
  MessageSquare,
  Sparkles,
  BarChart3,
  GraduationCap,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
  badge?: number;
  hideForRoles?: string[];
}

// El rol "asesor" solo debe ver su flujo operativo diario — sin Campañas
// (gasto/configuración publicitaria) ni Configuración (datos sensibles de
// la empresa, usuarios, credenciales).
function buildNavItems(unreadAlerts: number, newLeads: number): NavItem[] {
  return [
    { href: "/dashboard",     icon: LayoutDashboard, label: "Dashboard" },
    { href: "/leads",         icon: Users,           label: "Leads",         badge: newLeads || undefined },
    { href: "/pipeline",      icon: Kanban,          label: "Pipeline" },
    { href: "/campanas",      icon: Megaphone,       label: "Campañas",      hideForRoles: ["asesor"] },
    { href: "/whatsapp",      icon: MessageSquare,   label: "WhatsApp" },
    { href: "/alu-ia",        icon: Sparkles,        label: "ALU.IA",        badge: unreadAlerts || undefined },
    { href: "/proyecciones",  icon: TrendingUp,      label: "Proyecciones",  hideForRoles: ["asesor"] },
    { href: "/reportes",      icon: BarChart3,       label: "Reportes" },
    { href: "/entrenamiento", icon: GraduationCap,   label: "Entrenamiento" },
    { href: "/configuracion", icon: Settings,        label: "Configuración", hideForRoles: ["asesor"] },
  ];
}

interface Props {
  user: { name: string; email: string; role: string };
  unreadAlerts?: number;
  newLeads?: number;
  companyLogo?: string;
  companyName?: string;
}

export default function Sidebar({ user, unreadAlerts = 0, newLeads = 0, companyLogo, companyName }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const navItems = buildNavItems(unreadAlerts, newLeads)
    .filter((item) => !item.hideForRoles?.includes(user.role));

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 transition-all duration-300 flex-shrink-0"
      style={{
        width: collapsed ? 62 : 220,
        background: "linear-gradient(180deg, var(--color-surface-1) 0%, var(--color-surface-0) 100%)",
        borderRight: "1px solid rgba(114,85,180,0.13)",
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-3 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(114,85,180,0.1)" }}
      >
        {!collapsed && (
          <div className="flex-1 flex justify-center overflow-hidden">
            <Image
              src="/portalu-logo-light.png"
              alt="Portalu by Alucinando"
              width={158}
              height={31}
              style={{ filter: "drop-shadow(0 0 6px rgba(114,85,180,0.4))", width: "auto", height: 22 }}
            />
          </div>
        )}
        {collapsed && (
          <Image
            src="/isotype.svg"
            alt="Alucinando"
            width={26}
            height={26}
            className="mx-auto"
            style={{ filter: "drop-shadow(0 0 6px rgba(114,85,180,0.6))" }}
          />
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md transition-colors flex-shrink-0 hover:bg-white/5"
          style={{ color: "var(--color-text-muted)" }}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200 group relative",
                isActive ? "text-white" : "hover:text-white"
              )}
              style={{
                background: isActive
                  ? "linear-gradient(135deg, rgba(43,9,111,0.75) 0%, rgba(114,85,180,0.28) 100%)"
                  : "transparent",
                color: isActive ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                boxShadow: isActive ? "inset 0 0 0 1px rgba(114,85,180,0.28)" : "none",
              }}
              title={collapsed ? item.label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={15} />
                {item.badge && item.badge > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 text-[9px] font-bold rounded-full flex items-center justify-center"
                    style={{
                      background: item.label === "ALU.IA"
                        ? "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))"
                        : "var(--color-coral)",
                      color: "#fff",
                      minWidth: 14,
                      height: 14,
                      padding: "0 2px",
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span className="text-sm font-medium truncate">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User footer */}
      <div
        className="px-2 py-3 flex-shrink-0 space-y-1"
        style={{ borderTop: "1px solid rgba(114,85,180,0.1)" }}
      >
        {/* Company logo */}
        {companyLogo && (
          <div className="flex items-center justify-center px-2.5 py-3">
            <Image
              src={companyLogo}
              alt={companyName || "Logo"}
              width={collapsed ? 36 : 64}
              height={collapsed ? 36 : 64}
              className="rounded object-contain flex-shrink-0"
              style={{ background: "var(--color-violet-dim)", padding: 6 }}
            />
          </div>
        )}
        {!collapsed && (
          <div className="flex items-center gap-2.5 px-2.5 py-2 mb-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
              style={{ background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", color: "#fff" }}
            >
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-none" style={{ color: "var(--color-text-primary)" }}>
                {user.name.split(" ")[0]}
              </p>
              <p className="text-[10px] mt-0.5 leading-none capitalize" style={{ color: "var(--color-text-muted)" }}>
                {user.role}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-2.5 py-2.5 w-full rounded-lg transition-all hover:bg-white/5"
          style={{ color: "var(--color-text-muted)" }}
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>
    </aside>
  );
}
