"use client";

export const dynamic = "force-static";

import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  Zap,
  Target,
  Users,
  MessageSquare,
  BarChart3,
  Bot,
  Megaphone,
  ArrowRight,
  Check,
  Globe,
  Phone,
  Layers,
  Workflow,
  ChevronDown,
} from "lucide-react";
import Link from "next/link";

// ─── Sparkles canvas ───────────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  opacityDelta: number;
  color: string;
}

function SparklesCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const COLORS = ["rgba(255,255,255,", "rgba(114,85,180,", "rgba(160,130,200,"];
    const PARTICLE_COUNT = 60;
    let particles: Particle[] = [];
    let animId: number;

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function createParticle(): Particle {
      const w = canvas ? canvas.width : window.innerWidth;
      const h = canvas ? canvas.height : window.innerHeight;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.6 + 0.1,
        opacityDelta: (Math.random() - 0.5) * 0.006,
        color,
      };
    }

    function init() {
      particles = Array.from({ length: PARTICLE_COUNT }, createParticle);
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.opacity += p.opacityDelta;

        if (p.opacity <= 0.05 || p.opacity >= 0.7) p.opacityDelta *= -1;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.opacity})`;
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    init();
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}

// ─── Orbital module ─────────────────────────────────────────────────────────────

interface OrbitalModuleProps {
  angle: number;
  radius: number;
  label: string;
  icon: React.ReactNode;
  duration: number;
  delay?: number;
}

function OrbitalModule({ angle: _angle, radius, label, icon, duration, delay = 0 }: OrbitalModuleProps) {
  const offsetAngleDeg = _angle;
  return (
    <motion.div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: radius * 2,
        height: radius * 2,
        marginTop: -radius,
        marginLeft: -radius,
        borderRadius: "50%",
        rotate: offsetAngleDeg,
      }}
      animate={{ rotate: offsetAngleDeg + 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear", delay }}
    >
      <motion.div
        style={{
          position: "absolute",
          top: -34,
          left: "50%",
          translateX: "-50%",
        }}
        animate={{ rotate: -(offsetAngleDeg + 360) }}
        transition={{ duration, repeat: Infinity, ease: "linear", delay }}
      >
        <div
          style={{
            width: 68,
            height: 68,
            background: "rgba(43,9,111,0.55)",
            border: "1px solid rgba(114,85,180,0.45)",
            borderRadius: 14,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            boxShadow: "0 0 18px rgba(114,85,180,0.22), inset 0 1px 0 rgba(255,255,255,0.06)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div style={{ color: "#a08fcb", width: 20, height: 20 }}>{icon}</div>
          <span
            style={{
              fontSize: 9,
              fontWeight: 600,
              color: "#a09bbf",
              letterSpacing: "0.04em",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            {label}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Satellite dot ───────────────────────────────────────────────────────────────

function SatelliteDot({ radius, duration }: { radius: number; duration: number }) {
  return (
    <motion.div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        width: radius * 2,
        height: radius * 2,
        marginTop: -radius,
        marginLeft: -radius,
        borderRadius: "50%",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
      <div
        style={{
          position: "absolute",
          top: -5,
          left: "50%",
          transform: "translateX(-50%)",
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: "#fa7553",
          boxShadow: "0 0 14px #fa7553, 0 0 28px rgba(250,117,83,0.5)",
        }}
      />
    </motion.div>
  );
}

// ─── Moving border card ──────────────────────────────────────────────────────────

function MovingBorderCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 18,
        padding: 1,
        background: "conic-gradient(from 0deg, #2b096f, #7255b4, #fa7553, #7255b4, #2b096f)",
      }}
    >
      <motion.div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 18,
          background: "conic-gradient(from 0deg, transparent 70%, #fa7553 85%, transparent 100%)",
          filter: "blur(2px)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <div
        style={{
          position: "relative",
          borderRadius: 17,
          background: "#0e0e1a",
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Benefit card ────────────────────────────────────────────────────────────────

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}

function BenefitCard({ icon, title, description, index }: BenefitCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ scale: 1.025 }}
      style={{
        background: "rgba(20,20,36,0.7)",
        border: "1px solid rgba(114,85,180,0.2)",
        borderRadius: 16,
        padding: "28px 24px",
        backdropFilter: "blur(8px)",
        transition: "box-shadow 0.3s ease",
        cursor: "default",
      }}
      className="group hover:shadow-[0_0_40px_rgba(114,85,180,0.25)]"
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "rgba(43,9,111,0.5)",
          border: "1px solid rgba(114,85,180,0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          color: "#9b82d4",
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "#e9e8e6", marginBottom: 8, lineHeight: 1.3 }}>
        {title}
      </h3>
      <p style={{ fontSize: 13.5, color: "#a09bbf", lineHeight: 1.6, margin: 0 }}>
        {description}
      </p>
    </motion.div>
  );
}

// ─── Step card ───────────────────────────────────────────────────────────────────

interface StepProps {
  num: string;
  title: string;
  items: string[];
  index: number;
  isLast: boolean;
}

function StepCard({ num, title, items, index, isLast }: StepProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 0, flex: 1, minWidth: 160 }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
        style={{ flex: 1 }}
      >
        <div
          style={{
            fontSize: 42,
            fontWeight: 900,
            color: "rgba(114,85,180,0.22)",
            lineHeight: 1,
            marginBottom: 10,
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.03em",
          }}
        >
          {num}
        </div>
        <div
          style={{
            background: "rgba(20,20,36,0.6)",
            border: "1px solid rgba(114,85,180,0.18)",
            borderRadius: 14,
            padding: "20px 18px",
            backdropFilter: "blur(6px)",
          }}
        >
          <h4 style={{ fontSize: 14, fontWeight: 700, color: "#e9e8e6", marginBottom: 10 }}>{title}</h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
            {items.map((item) => (
              <li key={item} style={{ fontSize: 12.5, color: "#a09bbf", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#7255b4", flexShrink: 0, display: "inline-block" }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </motion.div>
      {!isLast && (
        <div
          style={{
            width: 40,
            height: 2,
            alignSelf: "center",
            marginTop: 20,
            background: "linear-gradient(to right, #2b096f, #fa7553)",
            borderRadius: 1,
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}

// ─── Integration chip ────────────────────────────────────────────────────────────

function IntegrationChip({ icon, name }: { icon: string; name: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.06, boxShadow: "0 0 22px rgba(114,85,180,0.35)" }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 16px",
        background: "rgba(43,9,111,0.3)",
        border: "1px solid rgba(114,85,180,0.3)",
        borderRadius: 40,
        fontSize: 13.5,
        fontWeight: 600,
        color: "#c4bcde",
        cursor: "default",
        transition: "box-shadow 0.25s ease",
      }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      {name}
    </motion.div>
  );
}

// ─── Navbar ──────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: scrolled ? "rgba(10,10,20,0.88)" : "transparent",
        backdropFilter: scrolled ? "blur(18px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(114,85,180,0.14)" : "1px solid transparent",
        transition: "background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "0 32px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: "#e9e8e6", letterSpacing: "-0.03em" }}>
            PORT<span style={{ color: "#fa7553" }}>.</span>ALU
          </span>
          <span style={{ fontSize: 11, color: "#5a5575", fontWeight: 500 }}>by Alucinando</span>
        </div>

        {/* Links */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
          className="hidden md:flex"
        >
          {["Características", "Beneficios", "Integraciones", "Precios"].map((link) => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              style={{
                fontSize: 13.5,
                fontWeight: 500,
                color: "#a09bbf",
                textDecoration: "none",
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "#e9e8e6")}
              onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "#a09bbf")}
            >
              {link}
            </a>
          ))}
        </nav>

        {/* CTA */}
        <Link href="/login">
          <motion.button
            whileHover={{ boxShadow: "0 0 28px rgba(114,85,180,0.55)" }}
            style={{
              padding: "9px 20px",
              background: "rgba(43,9,111,0.5)",
              border: "1px solid rgba(114,85,180,0.5)",
              borderRadius: 40,
              fontSize: 13.5,
              fontWeight: 600,
              color: "#d4c8f0",
              cursor: "pointer",
              transition: "box-shadow 0.25s ease",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Ingresar <ArrowRight size={14} />
          </motion.button>
        </Link>
      </div>
    </motion.nav>
  );
}

// ─── Dashboard mock ──────────────────────────────────────────────────────────────

function DashboardMock() {
  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          { label: "Leads nuevos", value: "248", delta: "+12%", color: "#7255b4" },
          { label: "Pipeline", value: "$84k", delta: "+8%", color: "#fa7553" },
          { label: "Campañas", value: "6", delta: "activas", color: "#22c55e" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              background: "rgba(43,9,111,0.3)",
              border: "1px solid rgba(114,85,180,0.2)",
              borderRadius: 10,
              padding: "12px 14px",
            }}
          >
            <div style={{ fontSize: 11, color: "#5a5575", marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: 10, color: "#a09bbf", marginTop: 2 }}>{stat.delta}</div>
          </div>
        ))}
      </div>

      {/* Mini chart */}
      <div
        style={{
          background: "rgba(20,20,36,0.6)",
          border: "1px solid rgba(114,85,180,0.15)",
          borderRadius: 10,
          padding: "14px 16px",
        }}
      >
        <div style={{ fontSize: 11, color: "#5a5575", marginBottom: 10 }}>Leads por semana</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 48 }}>
          {[30, 55, 42, 70, 62, 88, 75].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: "3px 3px 0 0",
                background: `rgba(114,85,180,${0.3 + (h / 100) * 0.6})`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Pipeline stages */}
      <div
        style={{
          background: "rgba(20,20,36,0.6)",
          border: "1px solid rgba(114,85,180,0.15)",
          borderRadius: 10,
          padding: "12px 14px",
        }}
      >
        <div style={{ fontSize: 11, color: "#5a5575", marginBottom: 8 }}>Pipeline activo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { stage: "Prospecto", pct: 85, color: "#7255b4" },
            { stage: "Propuesta", pct: 52, color: "#fa7553" },
            { stage: "Cierre", pct: 28, color: "#22c55e" },
          ].map((row) => (
            <div key={row.stage} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 10, color: "#a09bbf", width: 60 }}>{row.stage}</span>
              <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3 }}>
                <div
                  style={{
                    width: `${row.pct}%`,
                    height: "100%",
                    background: row.color,
                    borderRadius: 3,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main landing page ────────────────────────────────────────────────────────────

const ORBITAL_MODULES = [
  // Outer orbit r=280
  { label: "Meta Ads", icon: <Megaphone size={18} />, radius: 280, angle: 0, duration: 65 },
  { label: "WhatsApp", icon: <Phone size={18} />, radius: 280, angle: 90, duration: 65 },
  { label: "Ventas", icon: <Target size={18} />, radius: 280, angle: 180, duration: 65 },
  { label: "IA", icon: <Bot size={18} />, radius: 280, angle: 270, duration: 65 },
  // Inner orbit r=180
  { label: "CRM", icon: <Users size={18} />, radius: 180, angle: 45, duration: 50 },
  { label: "Leads", icon: <Zap size={18} />, radius: 180, angle: 135, duration: 50 },
  { label: "Dashboard", icon: <BarChart3 size={18} />, radius: 180, angle: 225, duration: 50 },
  { label: "Automatización", icon: <Workflow size={18} />, radius: 180, angle: 315, duration: 50 },
];

const BENEFITS = [
  {
    icon: <Target size={20} />,
    title: "Captura inteligente de leads",
    description: "De Meta Ads directo a tu CRM, sin pérdidas ni pasos manuales. Cada lead entra calificado y asignado.",
  },
  {
    icon: <Bot size={20} />,
    title: "IA Comercial (ALU.IA)",
    description: "Recomendaciones basadas en tu data real, no templates genéricos. Aprende de tu operación.",
  },
  {
    icon: <BarChart3 size={20} />,
    title: "Campañas en tiempo real",
    description: "Ve tus métricas de Meta Ads sin salir de la plataforma. Una vista, toda la información.",
  },
  {
    icon: <MessageSquare size={20} />,
    title: "WhatsApp integrado",
    description: "Toda tu comunicación organizada en un solo lugar. Historial completo, respuesta rápida.",
  },
  {
    icon: <Layers size={20} />,
    title: "Pipeline visual",
    description: "Drag & drop con probabilidades y valor automático por etapa. Siempre sabes en qué estás.",
  },
  {
    icon: <Globe size={20} />,
    title: "Reportes automáticos",
    description: "Resúmenes semanales generados con IA incluidos. Decisiones basadas en datos, no en intuición.",
  },
];

const STEPS = [
  {
    num: "01",
    title: "Captación",
    items: ["Meta Ads", "Formularios web", "WhatsApp"],
  },
  {
    num: "02",
    title: "Organización",
    items: ["CRM + Pipeline", "Leads calificados", "Asignación auto"],
  },
  {
    num: "03",
    title: "IA & Auto",
    items: ["ALU.IA activa", "Alertas automáticas", "Recomendaciones"],
  },
  {
    num: "04",
    title: "Gestión",
    items: ["WhatsApp", "Seguimiento", "Cierres"],
  },
  {
    num: "05",
    title: "Optimización",
    items: ["Reportes", "Meta Ads", "Dashboards"],
  },
];

const INTEGRATIONS = [
  { icon: "📘", name: "Meta" },
  { icon: "💬", name: "WhatsApp Business" },
  { icon: "🔍", name: "Google" },
  { icon: "🟠", name: "HubSpot" },
  { icon: "⚙️", name: "n8n" },
  { icon: "🟣", name: "HighLevel" },
  { icon: "📞", name: "VICIdial" },
  { icon: "✉️", name: "Resend" },
  { icon: "🔗", name: "API Propia" },
];

const FOOTER_LINKS = {
  Plataforma: ["Dashboard", "Leads", "Pipeline", "Campañas", "WhatsApp", "ALU.IA"],
  Recursos: ["Documentación", "Blog", "Changelog", "Status"],
  Empresa: ["Sobre nosotros", "Contacto", "Privacidad", "Términos"],
};

export default function LandingPage() {
  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -60]);

  const stagger = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
  };

  return (
    <div
      style={{
        background: "#0a0a14",
        minHeight: "100vh",
        color: "#e9e8e6",
        fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Background sparkles */}
      <SparklesCanvas />

      {/* Navbar */}
      <Navbar />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 80,
          paddingBottom: 60,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {/* Portal visual */}
        <motion.div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            translateX: "-50%",
            translateY: "-50%",
            width: 660,
            height: 660,
            y: heroY,
          }}
        >
          {/* Core glow */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 260,
              height: 260,
              borderRadius: "50%",
              transform: "translate(-50%,-50%)",
              background: "radial-gradient(circle at center, rgba(114,85,180,0.3) 0%, rgba(43,9,111,0.18) 50%, transparent 100%)",
              filter: "blur(24px)",
            }}
          />

          {/* Ring 1 — outer, slow */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 580,
              height: 580,
              borderRadius: "50%",
              border: "1px solid rgba(114,85,180,0.14)",
              transform: "translate(-50%,-50%)",
            }}
          />

          {/* Ring 2 — mid, with satellite */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 440,
              height: 440,
              borderRadius: "50%",
              border: "1px solid rgba(114,85,180,0.22)",
              transform: "translate(-50%,-50%)",
            }}
          >
            {/* Satellite on this ring */}
            <div
              style={{
                position: "absolute",
                top: -6,
                left: "50%",
                transform: "translateX(-50%)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: "#fa7553",
                boxShadow: "0 0 16px #fa7553, 0 0 32px rgba(250,117,83,0.4)",
              }}
            />
          </motion.div>

          {/* Ring 3 — inner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 300,
              height: 300,
              borderRadius: "50%",
              border: "1px solid rgba(114,85,180,0.3)",
              transform: "translate(-50%,-50%)",
            }}
          />

          {/* Satellite pulse on inner ring */}
          <SatelliteDot radius={150} duration={9} />

          {/* Orbital modules */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }}>
            {ORBITAL_MODULES.map((mod) => (
              <OrbitalModule
                key={`${mod.label}-${mod.radius}`}
                angle={mod.angle}
                radius={mod.radius}
                label={mod.label}
                icon={mod.icon}
                duration={mod.duration}
              />
            ))}
          </div>
        </motion.div>

        {/* Copy — centered over portal */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            maxWidth: 760,
            padding: "0 24px",
          }}
        >
          <motion.div
            {...stagger}
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              background: "rgba(43,9,111,0.4)",
              border: "1px solid rgba(114,85,180,0.35)",
              borderRadius: 40,
              fontSize: 12,
              fontWeight: 600,
              color: "#a08fcb",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            <Zap size={12} style={{ color: "#fa7553" }} />
            Sistema Operativo Comercial
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: "clamp(36px, 6vw, 72px)",
              fontWeight: 900,
              lineHeight: 1.08,
              letterSpacing: "-0.04em",
              color: "#e9e8e6",
              marginBottom: 22,
            }}
          >
            El centro operativo donde{" "}
            <span style={{ color: "#9b82d4" }}>marketing, publicidad,</span>
            <br />
            ventas e{" "}
            <span style={{ color: "#fa7553" }}>IA</span>{" "}
            trabajan juntos.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: 18,
              color: "#a09bbf",
              lineHeight: 1.65,
              maxWidth: 560,
              margin: "0 auto 36px",
            }}
          >
            Todo lo que necesita tu equipo comercial, unificado en una sola plataforma conectada.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.48, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 36px rgba(114,85,180,0.5)" }}
                style={{
                  padding: "14px 32px",
                  background: "linear-gradient(135deg, #2b096f 0%, #7255b4 60%, #fa7553 100%)",
                  border: "none",
                  borderRadius: 40,
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Solicitar demo <ArrowRight size={16} />
              </motion.button>
            </Link>
            <a href="#caracteristicas" style={{ textDecoration: "none" }}>
              <motion.button
                whileHover={{ borderColor: "rgba(114,85,180,0.8)", color: "#e9e8e6" }}
                style={{
                  padding: "14px 28px",
                  background: "transparent",
                  border: "1px solid rgba(114,85,180,0.4)",
                  borderRadius: 40,
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#a09bbf",
                  cursor: "pointer",
                  transition: "border-color 0.25s, color 0.25s",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Ver cómo funciona <ChevronDown size={16} />
              </motion.button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── SECCIÓN 2 — Not just a CRM ─────────────────────────────────────── */}
      <section
        id="caracteristicas"
        style={{
          position: "relative",
          zIndex: 1,
          maxWidth: 1180,
          margin: "0 auto",
          padding: "120px 32px",
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 64,
          alignItems: "center",
        }}
        className="md:grid-cols-[3fr_2fr]"
      >
        {/* Left copy */}
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <div
            style={{
              display: "inline-block",
              padding: "5px 12px",
              background: "rgba(43,9,111,0.35)",
              border: "1px solid rgba(114,85,180,0.3)",
              borderRadius: 40,
              fontSize: 11,
              fontWeight: 700,
              color: "#9b82d4",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            Sistema Operativo Comercial
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 3.5vw, 48px)",
              fontWeight: 900,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              color: "#e9e8e6",
              marginBottom: 24,
            }}
          >
            No es solo un CRM.
            <br />
            <span style={{ color: "#9b82d4" }}>Es tu sistema operativo</span>
            <br />
            comercial.
          </h2>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              "Pipeline visual con drag & drop en tiempo real",
              "IA que analiza y recomienda acciones automáticamente",
              "Campañas Meta Ads sincronizadas con tus leads",
              "WhatsApp Business integrado con historial completo",
            ].map((item) => (
              <li key={item} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "rgba(43,9,111,0.5)",
                    border: "1px solid rgba(114,85,180,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  <Check size={12} style={{ color: "#9b82d4" }} />
                </div>
                <span style={{ fontSize: 15, color: "#c4bcde", lineHeight: 1.5 }}>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Right — moving border dashboard card */}
        <motion.div
          initial={{ opacity: 0, x: 32 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        >
          <MovingBorderCard>
            <DashboardMock />
          </MovingBorderCard>
        </motion.div>
      </section>

      {/* ── SECCIÓN 3 — Beneficios ─────────────────────────────────────────── */}
      <section
        id="beneficios"
        style={{
          position: "relative",
          zIndex: 1,
          padding: "100px 32px",
          background: "rgba(20,14,36,0.4)",
          borderTop: "1px solid rgba(114,85,180,0.1)",
          borderBottom: "1px solid rgba(114,85,180,0.1)",
        }}
      >
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ textAlign: "center", marginBottom: 64 }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "5px 12px",
                background: "rgba(43,9,111,0.35)",
                border: "1px solid rgba(114,85,180,0.3)",
                borderRadius: 40,
                fontSize: 11,
                fontWeight: 700,
                color: "#9b82d4",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              Por qué PORTALU
            </div>
            <h2
              style={{
                fontSize: "clamp(26px, 3vw, 42px)",
                fontWeight: 900,
                color: "#e9e8e6",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
              }}
            >
              Todo lo que necesita tu equipo,
              <br />
              <span style={{ color: "#9b82d4" }}>sin complejidad</span>
            </h2>
          </motion.div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 18,
            }}
          >
            {BENEFITS.map((b, i) => (
              <BenefitCard key={b.title} {...b} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 4 — Cómo funciona ──────────────────────────────────────── */}
      <section
        id="como-funciona"
        style={{
          position: "relative",
          zIndex: 1,
          padding: "100px 32px",
        }}
      >
        <div style={{ maxWidth: 1160, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ textAlign: "center", marginBottom: 60 }}
          >
            <h2
              style={{
                fontSize: "clamp(26px, 3vw, 42px)",
                fontWeight: 900,
                color: "#e9e8e6",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                marginBottom: 14,
              }}
            >
              Cómo funciona
            </h2>
            <p style={{ fontSize: 16, color: "#a09bbf", maxWidth: 480, margin: "0 auto" }}>
              Desde la primera interacción hasta el cierre — todo dentro de PORTALU.
            </p>
          </motion.div>

          {/* Steps */}
          <div
            style={{
              display: "flex",
              alignItems: "stretch",
              gap: 0,
              overflowX: "auto",
              paddingBottom: 8,
            }}
          >
            {STEPS.map((step, i) => (
              <StepCard key={step.num} {...step} index={i} isLast={i === STEPS.length - 1} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECCIÓN 5 — Integraciones ──────────────────────────────────────── */}
      <section
        id="integraciones"
        style={{
          position: "relative",
          zIndex: 1,
          padding: "100px 32px",
          background: "rgba(20,14,36,0.35)",
          borderTop: "1px solid rgba(114,85,180,0.1)",
          borderBottom: "1px solid rgba(114,85,180,0.1)",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "5px 12px",
                background: "rgba(43,9,111,0.35)",
                border: "1px solid rgba(114,85,180,0.3)",
                borderRadius: 40,
                fontSize: 11,
                fontWeight: 700,
                color: "#9b82d4",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 18,
              }}
            >
              Conecta todo tu stack
            </div>
            <h2
              style={{
                fontSize: "clamp(26px, 3vw, 42px)",
                fontWeight: 900,
                color: "#e9e8e6",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                marginBottom: 48,
              }}
            >
              Funciona con las herramientas
              <br />
              <span style={{ color: "#9b82d4" }}>que ya usas</span>
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "center",
            }}
          >
            {INTEGRATIONS.map((int) => (
              <IntegrationChip key={int.name} icon={int.icon} name={int.name} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── SECCIÓN 6 — CTA Final ──────────────────────────────────────────── */}
      <section
        id="precios"
        style={{
          position: "relative",
          zIndex: 1,
          padding: "130px 32px",
          overflow: "hidden",
        }}
      >
        {/* Background radial glow */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 700,
            height: 700,
            transform: "translate(-50%,-50%)",
            background: "radial-gradient(circle at center, rgba(43,9,111,0.5) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center", position: "relative" }}>
          {/* Silhouette SVG */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ marginBottom: 24 }}
          >
            <svg width="56" height="72" viewBox="0 0 56 72" fill="none" xmlns="http://www.w3.org/2000/svg">
              <ellipse cx="28" cy="16" rx="12" ry="13" fill="rgba(114,85,180,0.35)" />
              <path
                d="M4 68c0-13.255 10.745-24 24-24s24 10.745 24 24"
                stroke="rgba(114,85,180,0.5)"
                strokeWidth="2"
                strokeLinecap="round"
              />
              {/* Portal glow below */}
              <ellipse cx="28" cy="68" rx="18" ry="5" fill="rgba(250,117,83,0.18)" />
            </svg>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: "clamp(30px, 4vw, 54px)",
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "#e9e8e6",
              marginBottom: 18,
            }}
          >
            Empieza a escalar hoy
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontSize: 17,
              color: "#a09bbf",
              lineHeight: 1.65,
              marginBottom: 40,
            }}
          >
            Únete a los equipos comerciales que ya transformaron su operación con PORTALU.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: "0 0 44px rgba(114,85,180,0.55)" }}
                style={{
                  padding: "15px 36px",
                  background: "linear-gradient(135deg, #2b096f 0%, #7255b4 60%, #fa7553 100%)",
                  border: "none",
                  borderRadius: 40,
                  fontSize: 15.5,
                  fontWeight: 700,
                  color: "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                Solicitar acceso <ArrowRight size={16} />
              </motion.button>
            </Link>
            <motion.button
              whileHover={{ borderColor: "rgba(114,85,180,0.7)", color: "#e9e8e6" }}
              style={{
                padding: "15px 32px",
                background: "transparent",
                border: "1px solid rgba(114,85,180,0.35)",
                borderRadius: 40,
                fontSize: 15.5,
                fontWeight: 600,
                color: "#a09bbf",
                cursor: "pointer",
                transition: "border-color 0.25s, color 0.25s",
              }}
            >
              Hablar con ventas
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer
        style={{
          position: "relative",
          zIndex: 1,
          borderTop: "1px solid rgba(114,85,180,0.14)",
          padding: "64px 32px 40px",
          background: "rgba(10,8,20,0.7)",
        }}
      >
        <div
          style={{
            maxWidth: 1160,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gap: 48,
          }}
          className="footer-grid"
        >
          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 14 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: "#e9e8e6", letterSpacing: "-0.03em" }}>
                PORT<span style={{ color: "#fa7553" }}>.</span>ALU
              </span>
            </div>
            <p style={{ fontSize: 13.5, color: "#5a5575", lineHeight: 1.65, maxWidth: 240 }}>
              Sistema operativo comercial que unifica marketing, ventas e IA en una sola plataforma.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([col, links]) => (
            <div key={col}>
              <h4
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#5a5575",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  marginBottom: 16,
                }}
              >
                {col}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      style={{
                        fontSize: 13.5,
                        color: "#a09bbf",
                        textDecoration: "none",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "#e9e8e6")}
                      onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "#a09bbf")}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            maxWidth: 1160,
            margin: "48px auto 0",
            paddingTop: 24,
            borderTop: "1px solid rgba(114,85,180,0.1)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12.5, color: "#5a5575", margin: 0 }}>
            &copy; 2025 Alucinando. PORTALU&reg; todos los derechos reservados.
          </p>
          <div style={{ display: "flex", gap: 20 }}>
            {["Privacidad", "Términos", "Cookies"].map((item) => (
              <a
                key={item}
                href="#"
                style={{ fontSize: 12.5, color: "#5a5575", textDecoration: "none" }}
                onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = "#a09bbf")}
                onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = "#5a5575")}
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
