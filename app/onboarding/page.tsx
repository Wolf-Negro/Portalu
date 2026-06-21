"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, ChevronLeft, Loader2, Sparkles, BarChart3, Target, Layout } from "lucide-react";

const STEPS = [
  {
    id: 1,
    icon: <Sparkles size={22} color="#fa7553" />,
    title: "¿Qué plataformas usas?",
    subtitle: "Selecciona todas las que manejas actualmente",
    key: "platforms",
    multi: true,
    options: [
      { value: "meta_ads", label: "Meta Ads", desc: "Facebook e Instagram", emoji: "📘" },
      { value: "google_ads", label: "Google Ads", desc: "Búsqueda y display", emoji: "🔍" },
      { value: "tiktok", label: "TikTok Ads", desc: "Video y contenido", emoji: "🎵" },
      { value: "email", label: "Email Marketing", desc: "Campañas por correo", emoji: "📧" },
      { value: "whatsapp", label: "WhatsApp", desc: "Mensajería directa", emoji: "💬" },
      { value: "organico", label: "Orgánico", desc: "SEO y redes sin pauta", emoji: "🌱" },
    ],
  },
  {
    id: 2,
    icon: <BarChart3 size={22} color="#9b82d4" />,
    title: "¿Qué métricas importan más?",
    subtitle: "Elegiremos los gráficos más relevantes para ti",
    key: "metrics",
    multi: true,
    options: [
      { value: "cpl", label: "CPL", desc: "Costo por lead", emoji: "💰" },
      { value: "roas", label: "ROAS", desc: "Retorno en publicidad", emoji: "📈" },
      { value: "conversion", label: "Conversión", desc: "Lead a cliente", emoji: "🎯" },
      { value: "alcance", label: "Alcance", desc: "Personas alcanzadas", emoji: "👥" },
      { value: "tiempo_respuesta", label: "Tiempo respuesta", desc: "Velocidad de atención", emoji: "⚡" },
      { value: "pipeline_valor", label: "Valor pipeline", desc: "Oportunidades abiertas", emoji: "🏆" },
    ],
  },
  {
    id: 3,
    icon: <Target size={22} color="#22c55e" />,
    title: "¿Cuál es tu objetivo este mes?",
    subtitle: "Portalu priorizará tu dashboard según este foco",
    key: "goal",
    multi: false,
    options: [
      { value: "aumentar_leads", label: "Más leads", desc: "Aumentar volumen de prospectos", emoji: "🚀" },
      { value: "mejorar_cierre", label: "Cerrar más ventas", desc: "Optimizar tasa de conversión", emoji: "💼" },
      { value: "reducir_cpl", label: "Reducir CPL", desc: "Bajar costo por lead", emoji: "📉" },
      { value: "escalar_equipo", label: "Escalar equipo", desc: "Incorporar más asesores", emoji: "👨‍👩‍👧" },
      { value: "mejorar_campañas", label: "Optimizar campañas", desc: "Mejor rendimiento en ads", emoji: "🎨" },
      { value: "fidelizar", label: "Fidelizar clientes", desc: "Retención y upsell", emoji: "❤️" },
    ],
  },
  {
    id: 4,
    icon: <Layout size={22} color="#7255b4" />,
    title: "¿Qué quieres ver en tu dashboard?",
    subtitle: "Personaliza los widgets de tu pantalla principal",
    key: "widgets",
    multi: true,
    options: [
      { value: "campanas_meta", label: "Campañas Meta", desc: "Métricas en tiempo real", emoji: "📊" },
      { value: "pipeline", label: "Pipeline", desc: "Estado de oportunidades", emoji: "🔄" },
      { value: "equipo", label: "Rendimiento del equipo", desc: "Actividad por asesor", emoji: "👥" },
      { value: "alertas", label: "Alertas IA", desc: "Notificaciones inteligentes", emoji: "🤖" },
      { value: "actividad", label: "Actividad reciente", desc: "Últimas acciones", emoji: "⏱️" },
      { value: "resumen_semanal", label: "Resumen semanal", desc: "Análisis de la semana", emoji: "📋" },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({
    platforms: [],
    metrics: [],
    goal: "",
    widgets: [],
  });

  const current = STEPS[step];

  function toggle(key: string, value: string, multi: boolean) {
    setAnswers((prev) => {
      if (multi) {
        const arr = (prev[key] as string[]) || [];
        return { ...prev, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
      }
      return { ...prev, [key]: value };
    });
  }

  function isSelected(key: string, value: string, multi: boolean): boolean {
    if (multi) return ((answers[key] as string[]) || []).includes(value);
    return answers[key] === value;
  }

  function canContinue(): boolean {
    const val = answers[current.key];
    if (current.multi) return (val as string[]).length > 0;
    return !!val;
  }

  async function handleFinish() {
    setSaving(true);
    await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(answers),
    });
    router.push("/dashboard");
  }

  const progress = ((step) / STEPS.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#080812", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
      {/* Background glow */}
      <div style={{ position: "fixed", top: "20%", left: "50%", transform: "translateX(-50%)", width: 600, height: 400, background: "radial-gradient(ellipse, rgba(114,85,180,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 580, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: "#e9e8e6", letterSpacing: "-0.04em" }}>
            PORT<span style={{ color: "#7255b4" }}>.</span>ALU
          </div>
          <div style={{ fontSize: 12.5, color: "#5a5575", marginTop: 6 }}>
            Configura tu experiencia personalizada
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, color: "#5a5575" }}>Paso {step + 1} de {STEPS.length}</span>
            <span style={{ fontSize: 11.5, color: "#7255b4", fontWeight: 600 }}>{Math.round(((step + 1) / STEPS.length) * 100)}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 9999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${((step + 1) / STEPS.length) * 100}%`, background: "linear-gradient(90deg, #2b096f, #7255b4)", borderRadius: 9999, transition: "width 0.4s ease" }} />
          </div>
          {/* Step dots */}
          <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 12 }}>
            {STEPS.map((s, i) => (
              <div key={s.id} style={{ width: i === step ? 20 : 8, height: 8, borderRadius: 9999, background: i < step ? "#7255b4" : i === step ? "#9b82d4" : "rgba(255,255,255,0.08)", transition: "all 0.3s ease" }} />
            ))}
          </div>
        </div>

        {/* Card */}
        <div style={{ background: "rgba(14,14,28,0.9)", border: "1px solid rgba(114,85,180,0.18)", borderRadius: 16, padding: "32px 32px 28px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
          {/* Step header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {current.icon}
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#e9e8e6", margin: 0, letterSpacing: "-0.02em" }}>{current.title}</h2>
              <p style={{ fontSize: 12.5, color: "#5a5575", margin: "3px 0 0" }}>{current.subtitle}</p>
            </div>
          </div>

          {/* Options grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 24, marginBottom: 28 }}>
            {current.options.map((opt) => {
              const selected = isSelected(current.key, opt.value, current.multi);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggle(current.key, opt.value, current.multi)}
                  style={{
                    padding: "14px 16px",
                    borderRadius: 10,
                    border: `1px solid ${selected ? "rgba(114,85,180,0.6)" : "rgba(255,255,255,0.07)"}`,
                    background: selected ? "rgba(43,9,111,0.35)" : "rgba(255,255,255,0.02)",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                    position: "relative",
                    outline: "none",
                  }}
                >
                  {selected && (
                    <div style={{ position: "absolute", top: 8, right: 8 }}>
                      <CheckCircle2 size={13} color="#9b82d4" />
                    </div>
                  )}
                  <div style={{ fontSize: 18, marginBottom: 6 }}>{opt.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: selected ? "#c4bcde" : "#a09bbf", marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 11.5, color: "#5a5575" }}>{opt.desc}</div>
                </button>
              );
            })}
          </div>

          {/* Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {step > 0 ? (
              <button
                onClick={() => setStep(step - 1)}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, fontSize: 13, color: "#7a7590", cursor: "pointer" }}
              >
                <ChevronLeft size={15} /> Atrás
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canContinue()}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "10px 22px",
                  background: canContinue() ? "linear-gradient(135deg, #2b096f, #7255b4)" : "rgba(114,85,180,0.15)",
                  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  color: canContinue() ? "#fff" : "#5a5575",
                  cursor: canContinue() ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}
              >
                Continuar <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!canContinue() || saving}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "10px 24px",
                  background: canContinue() && !saving ? "linear-gradient(135deg, #2b096f, #7255b4)" : "rgba(114,85,180,0.15)",
                  border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                  color: canContinue() && !saving ? "#fff" : "#5a5575",
                  cursor: canContinue() && !saving ? "pointer" : "not-allowed",
                  transition: "all 0.2s",
                }}
              >
                {saving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : <Sparkles size={14} />}
                {saving ? "Configurando..." : "¡Empezar con Portalu!"}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: 11.5, color: "#3a3550", marginTop: 20 }}>
          Puedes cambiar estas preferencias desde Configuración en cualquier momento
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
