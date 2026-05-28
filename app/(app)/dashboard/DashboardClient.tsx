"use client";

import {
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Users, TrendingUp, DollarSign, Target, Bell,
  ArrowUpRight, ArrowDownRight, Zap, Activity,
} from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/utils";
import Link from "next/link";

const COLORS = ["#7255b4", "#fa7553", "#2b096f", "#e9e8e6", "#a09bbf"];

const mockPerformanceData = Array.from({ length: 30 }, (_, i) => ({
  day: `Día ${i + 1}`,
  leads: Math.floor(Math.random() * 20) + 5,
  ventas: Math.floor(Math.random() * 8) + 1,
  ingresos: Math.floor(Math.random() * 5000) + 1000,
}));

const originData = [
  { name: "Meta Ads", value: 48, color: "#7255b4" },
  { name: "WhatsApp", value: 21, color: "#fa7553" },
  { name: "Formularios", value: 15, color: "#2b096f" },
  { name: "Landing Page", value: 10, color: "#a09bbf" },
  { name: "Otros", value: 6, color: "#5a5575" },
];

interface MetaToday {
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  leads: number;
  ctr: number;
}

interface Props {
  stats: {
    totalLeads: number;
    newLeads: number;
    opportunities: number;
    totalRevenue: number;
    conversionRate: string;
    alerts: number;
  };
  recentActivities: any[];
  userName: string;
  metaToday?: MetaToday | null;
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  trend,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  trend?: "up" | "down";
  accent?: string;
}) {
  return (
    <div className="rounded-xl p-5 relative overflow-hidden transition-all hover:scale-[1.01]"
      style={{
        background: "rgba(22,22,42,0.8)",
        border: "1px solid rgba(114,85,180,0.18)",
        backdropFilter: "blur(12px)",
      }}>
      {/* Gradient accent top */}
      <div className="absolute top-0 left-0 right-0 h-0.5"
        style={{ background: accent || "linear-gradient(90deg, #2b096f, #7255b4)" }} />

      <div className="flex items-start justify-between mb-4">
        <div className="p-2 rounded-lg"
          style={{ background: "rgba(43,9,111,0.4)", border: "1px solid rgba(114,85,180,0.2)" }}>
          <Icon size={16} style={{ color: "#7255b4" }} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs"
            style={{ color: trend === "up" ? "#22c55e" : "#ef4444" }}>
            {trend === "up" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            <span>{trend === "up" ? "+12%" : "-3%"}</span>
          </div>
        )}
      </div>

      <div className="text-2xl font-bold mb-1" style={{ color: "#e9e8e6" }}>{value}</div>
      <div className="text-sm font-medium mb-0.5" style={{ color: "#a09bbf" }}>{label}</div>
      <div className="text-xs" style={{ color: "#5a5575" }}>{sub}</div>
    </div>
  );
}

export default function DashboardClient({ stats, recentActivities, userName, metaToday }: Props) {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "#e9e8e6" }}>
            Hola, {userName.split(" ")[0]} 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "#a09bbf" }}>
            Aquí está el resumen de hoy
          </p>
        </div>
        <Link href="/alu-ia" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: "linear-gradient(135deg, #2b096f 0%, #7255b4 100%)",
            color: "#e9e8e6",
            boxShadow: "0 4px 16px rgba(43,9,111,0.4)",
          }}>
          <Zap size={14} />
          ALU.IA
          {stats.alerts > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: "#fa7553", color: "#fff" }}>
              {stats.alerts}
            </span>
          )}
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Leads nuevos"
          value={String(stats.newLeads)}
          sub={`${stats.totalLeads} total`}
          trend="up"
        />
        <StatCard
          icon={Target}
          label="Oportunidades"
          value={String(stats.opportunities)}
          sub="En el pipeline"
          trend="up"
          accent="linear-gradient(90deg, #fa7553, #2b096f)"
        />
        <StatCard
          icon={TrendingUp}
          label="Conversión"
          value={`${stats.conversionRate}%`}
          sub="Leads → Ventas"
          trend="down"
          accent="linear-gradient(90deg, #7255b4, #fa7553)"
        />
        <StatCard
          icon={DollarSign}
          label="Ingresos"
          value={formatCurrency(stats.totalRevenue)}
          sub="Cerrados ganados"
          trend="up"
          accent="linear-gradient(90deg, #2b096f, #7255b4)"
        />
        {metaToday != null && (
          <StatCard
            icon={Activity}
            label="Meta Ads · Hoy"
            value={formatCurrency(metaToday.spend)}
            sub={`${formatNumber(metaToday.clicks)} clics · ${metaToday.ctr.toFixed(2)}% CTR`}
            accent="linear-gradient(90deg, #1877F2, #7255b4)"
          />
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Performance line chart */}
        <div className="xl:col-span-2 rounded-xl p-5"
          style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-sm" style={{ color: "#e9e8e6" }}>Rendimiento — últimos 30 días</h3>
              <p className="text-xs mt-0.5" style={{ color: "#5a5575" }}>Leads captados y ventas cerradas</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={mockPerformanceData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="leads-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7255b4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7255b4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ventas-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#fa7553" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#fa7553" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(114,85,180,0.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#5a5575" }} tickLine={false} axisLine={false}
                interval={4} />
              <YAxis tick={{ fontSize: 10, fill: "#5a5575" }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#141420", border: "1px solid rgba(114,85,180,0.3)",
                  borderRadius: 8, fontSize: 12, color: "#e9e8e6",
                }}
              />
              <Area type="monotone" dataKey="leads" stroke="#7255b4" strokeWidth={2}
                fill="url(#leads-grad)" name="Leads" />
              <Area type="monotone" dataKey="ventas" stroke="#fa7553" strokeWidth={2}
                fill="url(#ventas-grad)" name="Ventas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Donut chart */}
        <div className="rounded-xl p-5"
          style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
          <h3 className="font-semibold text-sm mb-1" style={{ color: "#e9e8e6" }}>Leads por origen</h3>
          <p className="text-xs mb-4" style={{ color: "#5a5575" }}>Distribución de canales</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={originData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {originData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#141420", border: "1px solid rgba(114,85,180,0.3)",
                  borderRadius: 8, fontSize: 11, color: "#e9e8e6",
                }}
                formatter={(value: any) => [`${value}%`, ""]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {originData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-xs" style={{ color: "#a09bbf" }}>{item.name}</span>
                </div>
                <span className="text-xs font-medium" style={{ color: "#e9e8e6" }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: Activity + Quick Access */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Activity feed */}
        <div className="rounded-xl p-5"
          style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={14} style={{ color: "#7255b4" }} />
            <h3 className="font-semibold text-sm" style={{ color: "#e9e8e6" }}>Actividad reciente</h3>
          </div>
          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-center py-4" style={{ color: "#5a5575" }}>
                Sin actividad reciente
              </p>
            ) : (
              recentActivities.slice(0, 6).map((activity: any, i) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                    style={{ background: i % 2 === 0 ? "#7255b4" : "#fa7553" }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs" style={{ color: "#a09bbf" }}>{activity.description}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "#5a5575" }}>
                      {activity.user?.name && `${activity.user.name} · `}
                      {new Date(activity.createdAt).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick access */}
        <div className="rounded-xl p-5"
          style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
          <h3 className="font-semibold text-sm mb-4" style={{ color: "#e9e8e6" }}>Acceso rápido</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: "/leads", label: "Nuevo Lead", icon: Users, color: "#7255b4" },
              { href: "/pipeline", label: "Ver Pipeline", icon: Target, color: "#fa7553" },
              { href: "/campanas", label: "Campañas", icon: Bell, color: "#2b096f" },
              { href: "/alu-ia", label: "Chat IA", icon: Zap, color: "#7255b4" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-2.5 p-4 rounded-lg text-center transition-all hover:scale-[1.02]"
                style={{
                  background: "rgba(43,9,111,0.2)",
                  border: "1px solid rgba(114,85,180,0.2)",
                }}
              >
                <div className="p-2 rounded-lg" style={{ background: `${item.color}22` }}>
                  <item.icon size={16} style={{ color: item.color }} />
                </div>
                <span className="text-xs font-medium" style={{ color: "#a09bbf" }}>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
