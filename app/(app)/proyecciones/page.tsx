"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  TrendingUp, Calculator, Loader2, History, RefreshCw, BarChart2, Download,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalcResult {
  investment?: [number, number];
  reach:       [number, number];
  clicks:      [number, number];
  visits:      [number, number];
  leads:       [number, number];
  interested:  [number, number];
  sales:       [number, number];
  revenue:     [number, number];
}

interface HistoryItem {
  id: string;
  mode: string;
  businessType: string;
  ticket: string;
  difficulty: string;
  productPrice: number;
  input: number;
  result: string;
  createdAt: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt      = (n: number)  => Math.round(n).toLocaleString("es-PE");
const fmtMoney = (n: number)  => `S/ ${Math.round(n).toLocaleString("es-PE")}`;
const avg      = ([a, b]: [number, number]) => (a + b) / 2;

const DIFFICULTY_LABELS: Record<string, string> = { easy: "Fácil", medium: "Media", hard: "Difícil" };
const TICKET_LABELS: Record<string, string>     = { high: "Alto",  low: "Bajo" };
const DIFF_COLORS: Record<string, string>        = { easy: "var(--color-success)", medium: "var(--color-warning)", hard: "var(--color-danger)" };

// ─── Funnel config ───────────────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { key: "reach",      label: "1. Alcance Mensual",    sub: "Personas que ven tus anuncios",      offset: 0,   color: "var(--color-violet-dim)", icon: "📢", convLabel: "CTR (Clics)" },
  { key: "clicks",     label: "2. Clics en Anuncios",  sub: "Interés inicial en campañas",         offset: 44,  color: "#3D3A8C", icon: "🖱️", convLabel: "Eficiencia de Carga" },
  { key: "visits",     label: "3. Visitas a Landing",  sub: "Llegaron a tu página web",            offset: 88,  color: "#5C5AAD", icon: "🌐", convLabel: "Conversión a Lead" },
  { key: "leads",      label: "4. Contactos WhatsApp", sub: "Abrieron chat o registraron datos",   offset: 132, color: "#0E7490", icon: "💬", convLabel: "Conversión IA" },
  { key: "interested", label: "5. Prospectos Reales",  sub: "Filtro por Inteligencia Artificial",  offset: 176, color: "#B45309", icon: "🎯", convLabel: "Ratio de Cierre" },
  { key: "sales",      label: "6. Ventas Estimadas",   sub: "Cierres de clientes logrados",        offset: 220, color: "#15803D", icon: "💰", convLabel: "" },
] as const;

// ─── Sub-components ──────────────────────────────────────────────────────────

function SelectCard({ label, sub, selected, onClick }: { label: string; sub?: string; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      flex: 1, padding: "10px 14px", borderRadius: 8, cursor: "pointer", transition: "all 0.15s", textAlign: "center",
      border: `1px solid ${selected ? "rgba(114,85,180,0.6)" : "rgba(255,255,255,0.07)"}`,
      background: selected ? "linear-gradient(135deg, rgba(43,9,111,0.6), rgba(114,85,180,0.25))" : "rgba(255,255,255,0.03)",
      color: selected ? "var(--color-text-primary)" : "var(--color-text-faint)",
      boxShadow: selected ? "0 0 0 1px rgba(114,85,180,0.3)" : "none",
    }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
      {sub && <div style={{ fontSize: 10.5, marginTop: 2, opacity: 0.7 }}>{sub}</div>}
    </button>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function FunnelSection({ data }: { data: CalcResult }) {
  return (
    <div>
      {FUNNEL_STAGES.map((stage, idx) => {
        const range = data[stage.key as keyof CalcResult] as [number, number] | undefined;
        if (!range) return null;
        const nextStage = FUNNEL_STAGES[idx + 1];
        const nextRange = nextStage ? data[nextStage.key as keyof CalcResult] as [number, number] | undefined : undefined;
        const curAvg  = avg(range);
        const nextAvg = nextRange ? avg(nextRange) : 0;
        const rate = curAvg > 0 && nextAvg > 0 ? ((nextAvg / curAvg) * 100).toFixed(1) : null;

        return (
          <div key={stage.key}>
            <div style={{ marginLeft: stage.offset, marginRight: stage.offset }}>
              <div style={{
                height: 50, background: stage.color, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 16px", boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{stage.icon}</span>
                  <div style={{ overflow: "hidden" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stage.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stage.sub}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", marginLeft: 12, flexShrink: 0 }}>
                  {fmt(range[0])} – {fmt(range[1])}
                </div>
              </div>
            </div>
            {rate && nextStage && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "5px 0" }}>
                <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(114,85,180,0.15)", border: "1px solid rgba(114,85,180,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="8" height="10" viewBox="0 0 10 12" fill="none">
                    <line x1="5" y1="1" x2="5" y2="8" stroke="var(--color-lavender)" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M1.5 6.5L5 10.5L8.5 6.5" stroke="var(--color-lavender)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                  </svg>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--color-violet-soft)", background: "rgba(114,85,180,0.1)", border: "1px solid rgba(114,85,180,0.2)", borderRadius: 20, padding: "2px 10px" }}>
                  {stage.convLabel}: {rate}%
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SidebarMetric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
      <div style={{ width: 34, height: 34, borderRadius: 8, background: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 10.5, color: "var(--color-text-faint)", fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 800, color: "var(--color-text-primary)" }}>{value}</div>
      </div>
    </div>
  );
}

function FeatureItem({ icon, bg, title, desc }: { icon: React.ReactNode; bg: string; title: string; desc: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 0" }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", lineHeight: 1.4 }}>{desc}</div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProyeccionesPage() {
  const [mode,        setMode]        = useState<"investment" | "sales_goal">("investment");
  const [bizType,     setBizType]     = useState<"B2B" | "B2C">("B2C");
  const [ticket,      setTicket]      = useState<"high" | "low">("low");
  const [difficulty,  setDifficulty]  = useState<"easy" | "medium" | "hard">("easy");
  const [productPrice,setProductPrice]= useState("500");
  const [investment,  setInvestment]  = useState("3800");
  const [targetSales, setTargetSales] = useState("100");
  const [companyName, setCompanyName] = useState("");
  const [result,      setResult]      = useState<CalcResult | null>(null);
  const [resultDate,  setResultDate]  = useState("");
  const [loading,     setLoading]     = useState(false);
  const [exporting,   setExporting]   = useState(false);
  const [error,       setError]       = useState("");
  const [toast,       setToast]       = useState("");
  const [history,     setHistory]     = useState<HistoryItem[]>([]);
  const [histLoading, setHistLoading] = useState(true);

  const dashboardRef = useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch("/api/proyecciones/history");
      const d = await r.json();
      setHistory(d.projections || []);
    } catch {}
    setHistLoading(false);
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3400);
  }

  async function handleCalculate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const inputVal = mode === "investment" ? investment : targetSales;
    if (!productPrice || !inputVal) {
      setError("Completa todos los campos antes de calcular.");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch("/api/proyecciones/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, businessType: bizType, ticket, difficulty, productPrice, investment, targetSales }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data);
        const now = new Date();
        const dateStr = now.toLocaleDateString("es-PE", { day: "2-digit", month: "long", year: "numeric" });
        const timeStr = now.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
        setResultDate(`${dateStr} · ${timeStr}`);
        loadHistory();
      } else {
        setError(json.error || "Error al calcular");
      }
    } catch { setError("Error de conexión"); }
    setLoading(false);
  }

  async function handleExport() {
    if (!result) {
      showToast("⚠️ Primero genera tu proyección para poder exportarla.");
      return;
    }
    if (!dashboardRef.current) return;
    setExporting(true);

    // Inject a safe-override style into the LIVE document BEFORE html2canvas
    // clones it. Tailwind v4 + shadcn define CSS variables using oklch()/lab()
    // (e.g. --border, --ring, --background in :root) AND apply them to every
    // element via `* { @apply border-border outline-ring/50 }`. html2canvas
    // reads getComputedStyle() on each element — if any value is oklch/lab it
    // crashes. Overriding the variables here ensures the clone already has safe
    // values when html2canvas reads computed styles.
    const safeOverride = document.createElement("style");
    safeOverride.id = "__h2c_safe";
    safeOverride.textContent = `
      :root, .dark {
        --background:#0f0e1d; --foreground:var(--color-text-primary);
        --card:var(--color-surface-card); --card-foreground:var(--color-text-primary);
        --popover:var(--color-surface-card); --popover-foreground:var(--color-text-primary);
        --primary:var(--color-text-primary); --primary-foreground:#0f0e1d;
        --secondary:var(--color-surface-2); --secondary-foreground:var(--color-text-primary);
        --muted:var(--color-surface-2); --muted-foreground:var(--color-text-muted);
        --accent:var(--color-surface-2); --accent-foreground:var(--color-text-primary);
        --destructive:var(--color-danger); --destructive-foreground:#fff;
        --border:rgba(114,85,180,0.18); --input:rgba(255,255,255,0.06);
        --ring:rgba(114,85,180,0.4);
        --chart-1:var(--color-lavender); --chart-2:var(--color-text-muted); --chart-3:#3a3550;
        --chart-4:#2a2545; --chart-5:#1a1530;
        --sidebar:var(--color-surface-1); --sidebar-foreground:var(--color-text-primary);
        --sidebar-primary:var(--color-lavender); --sidebar-primary-foreground:#fff;
        --sidebar-accent:var(--color-surface-2); --sidebar-accent-foreground:var(--color-text-primary);
        --sidebar-border:rgba(114,85,180,0.18); --sidebar-ring:rgba(114,85,180,0.4);
      }
      *, *::before, *::after {
        border-color: rgba(114,85,180,0.18) !important;
        outline-color: transparent !important;
      }
    `;
    document.head.appendChild(safeOverride);

    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF }   = await import("jspdf");

      // Preload watermark logo as dataURL
      const logoDataUrl = await new Promise<string | null>((resolve) => {
        const img = new window.Image();
        img.onload = () => {
          try {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth; c.height = img.naturalHeight;
            c.getContext("2d")!.drawImage(img, 0, 0);
            resolve(c.toDataURL("image/png"));
          } catch { resolve(null); }
        };
        img.onerror = () => resolve(null);
        img.src = "/logo-violet.png";
      });

      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#0f0e1d",
        logging: false,
        onclone: (doc, clonedEl) => {
          // Second layer: remove every stylesheet from the clone so no
          // residual oklch/lab value can survive from the cloned head.
          doc.querySelectorAll('link[rel="stylesheet"], style').forEach((el) => el.remove());

          const fix = doc.createElement("style");
          fix.textContent = `
            *, *::before, *::after {
              box-sizing: border-box;
              transition: none !important;
              animation: none !important;
              border-color: rgba(114,85,180,0.18) !important;
              outline-color: transparent !important;
            }
            img { display: block; max-width: 100%; }
          `;
          doc.head.appendChild(fix);

          // Watermark
          if (logoDataUrl) {
            (clonedEl as HTMLElement).style.position = "relative";
            const wm = doc.createElement("div");
            wm.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.08;pointer-events:none;z-index:9999;";
            const wmImg = doc.createElement("img");
            wmImg.src = logoDataUrl;
            wmImg.style.cssText = "width:320px;height:auto;display:block;";
            wm.appendChild(wmImg);
            (clonedEl as HTMLElement).appendChild(wm);
          }
        },
      });

      const imgData = canvas.toDataURL("image/png");
      const margin  = 14;
      const mmW     = (canvas.width  / 2) * 0.264583;
      const mmH     = (canvas.height / 2) * 0.264583;
      const pageW   = mmW + margin * 2;
      const pageH   = mmH + margin * 2;

      const pdf = new jsPDF({ orientation: pageW > pageH ? "l" : "p", unit: "mm", format: [pageW, pageH] });
      pdf.setFillColor(15, 14, 29);
      pdf.rect(0, 0, pageW, pageH, "F");
      pdf.addImage(imgData, "PNG", margin, margin, mmW, mmH);

      const slug = (companyName || "proyeccion")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "");
      pdf.save(`proyeccion-${slug || "alucinando"}.pdf`);
      showToast("✅ PDF generado correctamente");
    } catch (err: any) {
      showToast("❌ " + (err?.message || "No se pudo generar el PDF. Intenta de nuevo."));
    } finally {
      document.getElementById("__h2c_safe")?.remove();
      setExporting(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(114,85,180,0.2)",
    borderRadius: 8, fontSize: 13, color: "var(--color-text-primary)", outline: "none", boxSizing: "border-box",
  };

  const totalConv = result
    ? (avg(result.interested) > 0 ? ((avg(result.sales) / avg(result.interested)) * 100).toFixed(1) : "0.0")
    : "0.0";

  const investmentDisplay = result
    ? result.investment
      ? `${fmtMoney(result.investment[0])} – ${fmtMoney(result.investment[1])}`
      : fmtMoney(parseFloat(investment))
    : "—";

  return (
    <div style={{ padding: "28px 32px", maxWidth: 1360, margin: "0 auto" }}>

      {/* ── Page header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={18} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--color-text-primary)", letterSpacing: "-0.03em", margin: 0 }}>
              Proyecciones <span style={{ color: "var(--color-lavender)" }}>Alucinando™</span>
            </h1>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", margin: 0 }}>Simula tu inversión publicitaria y proyecta ventas</p>
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || !result}
          style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 18px",
            background: result ? "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))" : "rgba(255,255,255,0.04)",
            border: `1px solid ${result ? "rgba(114,85,180,0.5)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            color: result ? "#fff" : "#3a3550",
            cursor: result && !exporting ? "pointer" : "not-allowed",
            opacity: exporting ? 0.7 : 1, transition: "all 0.2s",
          }}
        >
          {exporting
            ? <><Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> Generando PDF...</>
            : <><Download size={13} /> Exportar proyección</>}
        </button>
      </div>

      {/* ── Main grid ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>

        {/* ── LEFT: Form ────────────────────────────────────────────── */}
        <div style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.15)", borderRadius: 16, padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <Calculator size={15} color="var(--color-lavender)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>Configuración</span>
          </div>

          <form onSubmit={handleCalculate}>

            {/* Company name */}
            <FormSection title="Nombre de tu empresa o marca">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </span>
                <input style={{ ...inputStyle, paddingLeft: 34 }} type="text" placeholder="Ej. Mi Empresa S.A." maxLength={60} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
              </div>
              <div style={{ fontSize: 10.5, color: "#3a3550", marginTop: 4 }}>Aparecerá en tu proyección al exportar.</div>
            </FormSection>

            {/* Business type */}
            <FormSection title="Modelo de negocio">
              <div style={{ display: "flex", gap: 6 }}>
                {(["B2C", "B2B"] as const).map((t) => (
                  <SelectCard key={t} label={t} sub={t === "B2B" ? "Corporativo / Empresas" : "Consumidor final"} selected={bizType === t} onClick={() => setBizType(t)} />
                ))}
              </div>
            </FormSection>

            {/* Ticket */}
            <FormSection title="Ticket promedio">
              <div style={{ display: "flex", gap: 6 }}>
                {([["high", "Alto", "💎", "Venta premium"], ["low", "Bajo", "🛒", "Compra rápida / Impulso"]] as const).map(([val, label, ico, sub]) => (
                  <SelectCard key={val} label={`${ico} ${label}`} sub={sub} selected={ticket === val} onClick={() => setTicket(val)} />
                ))}
              </div>
            </FormSection>

            {/* Price */}
            <FormSection title="Precio de tu producto">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", fontSize: 12 }}>S/.</span>
                <input style={{ ...inputStyle, paddingLeft: 36 }} type="number" min="1" placeholder="500" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} />
              </div>
              <div style={{ fontSize: 10.5, color: "#3a3550", marginTop: 4 }}>¿Cuánto cuesta lo que vendes?</div>
            </FormSection>

            {/* Difficulty */}
            <FormSection title="Dificultad de venta">
              <div style={{ display: "flex", gap: 6 }}>
                {([["easy", "😊 Fácil", "Rápido"], ["medium", "😐 Media", "Considerado"], ["hard", "😟 Difícil", "Consultivo"]] as const).map(([val, label, sub]) => (
                  <SelectCard key={val} label={label} sub={sub} selected={difficulty === val} onClick={() => setDifficulty(val)} />
                ))}
              </div>
            </FormSection>

            {/* Mode */}
            <FormSection title="Método de cálculo">
              <div style={{ display: "flex", gap: 6 }}>
                {(["investment", "sales_goal"] as const).map((m) => (
                  <SelectCard
                    key={m}
                    label={m === "investment" ? "📊 Por inversión" : "🎯 Por meta de ventas"}
                    sub={m === "investment" ? "¿Cuánto invertir?" : "¿Cuántas quieres vender?"}
                    selected={mode === m}
                    onClick={() => setMode(m)}
                  />
                ))}
              </div>
            </FormSection>

            {/* Dynamic input */}
            {mode === "investment" ? (
              <FormSection title="Inversión mensual disponible">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", fontSize: 12 }}>S/.</span>
                  <input style={{ ...inputStyle, paddingLeft: 36 }} type="number" min="1" placeholder="3800" value={investment} onChange={(e) => setInvestment(e.target.value)} />
                </div>
              </FormSection>
            ) : (
              <FormSection title="Meta de ventas mensuales">
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)", fontSize: 12 }}>#</span>
                  <input style={{ ...inputStyle, paddingLeft: 36 }} type="number" min="1" placeholder="100" value={targetSales} onChange={(e) => setTargetSales(e.target.value)} />
                </div>
              </FormSection>
            )}

            {error && (
              <div style={{ padding: "10px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, fontSize: 12, color: "#f87171", marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: "100%", padding: "12px",
              background: "linear-gradient(135deg, var(--color-violet-dim), var(--color-lavender))",
              border: "none", borderRadius: 10, color: "#fff", fontSize: 13.5, fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: loading ? 0.7 : 1, transition: "opacity 0.15s",
            }}>
              {loading
                ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Calculando...</>
                : <><BarChart2 size={14} /> ✨ Calcular mi proyección →</>}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Results ──────────────────────────────────────────── */}
        <div>
          {!result ? (
            /* Empty state */
            <div style={{
              background: "var(--color-surface-glass)", border: "1px dashed rgba(114,85,180,0.2)",
              borderRadius: 16, padding: "60px 40px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center",
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/isotype-violet.png" alt="Alucinando" style={{ width: 60, opacity: 0.4 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--color-text-muted)", marginBottom: 8 }}>Tu proyección personalizada</div>
                <div style={{ fontSize: 13, color: "#3a3550", lineHeight: 1.7 }}>
                  Completa el cuestionario de la izquierda y descubre<br />cuánto deberías invertir para alcanzar tus objetivos.
                </div>
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 12 }}>
                {[["📊", "Datos precisos", "Algoritmos basados en casos reales."], ["🛡️", "Estrategia personalizada", "Recomendaciones adaptadas a tu negocio."], ["🚀", "Resultados medibles", "Proyecciones alcanzables y 100% medibles."]].map(([ico, t, d]) => (
                  <div key={t} style={{ textAlign: "center", maxWidth: 140 }}>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{ico}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-faint)", marginBottom: 3 }}>{t}</div>
                    <div style={{ fontSize: 10.5, color: "#3a3550", lineHeight: 1.4 }}>{d}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Dashboard — this div is captured by html2canvas */
            <div
              id="proyecciones-dashboard"
              ref={dashboardRef}
              style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.2)", borderRadius: 16, padding: 24, position: "relative" }}
            >

              {/* Title row */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(114,85,180,0.15)", border: "1px solid rgba(114,85,180,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/isotype-violet.png" alt="Alucinando" style={{ width: 26, height: 26, objectFit: "contain" }} />
                </div>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>Tu proyección está lista 🎉</h2>
                  <p style={{ fontSize: 11.5, color: "var(--color-text-muted)", margin: 0 }}>Estos son los resultados estimados de tu inversión.</p>
                </div>
                <svg style={{ marginLeft: "auto", marginBottom: -14, flexShrink: 0 }} width="56" height="48" viewBox="0 0 66 58" fill="none">
                  <path d="M8 6 C 12 6 44 8 56 48" stroke="#5707D6" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M48 40 L56 48 L62 40" stroke="#5707D6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Info bar */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 14px", marginBottom: 18,
                background: "rgba(114,85,180,0.07)", border: "1px solid rgba(114,85,180,0.15)",
                borderRadius: 8, fontSize: 11.5,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--color-text-secondary)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                  <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{companyName || "Sin nombre"}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--color-text-muted)" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  {resultDate}
                </div>
              </div>

              {/* Two columns: funnel + sidebar */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 20, marginBottom: 20 }}>

                {/* Funnel */}
                <div>
                  <FunnelSection data={result} />
                </div>

                {/* Sidebar summary */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 12 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--color-lavender)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-text-secondary)" }}>Resumen de tu proyección</span>
                  </div>

                  <SidebarMetric
                    accent="#0E7490"
                    label="Inversión mensual"
                    value={investmentDisplay}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                  />
                  <SidebarMetric
                    accent="#D97706"
                    label="Conversión total"
                    value={`${totalConv}%`}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>}
                  />
                  <SidebarMetric
                    accent="#7C3AED"
                    label="Ventas estimadas"
                    value={`${fmt(result.sales[0])} – ${fmt(result.sales[1])}`}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>}
                  />
                  <SidebarMetric
                    accent="#059669"
                    label="Ingresos estimados"
                    value={`${fmtMoney(result.revenue[0])} – ${fmtMoney(result.revenue[1])}`}
                    icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
                  />

                  {/* Methodology card */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, padding: "12px", background: "rgba(255,255,255,0.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/smart-leads-logo.jpeg" alt="Smart Leads" style={{ width: 34, height: 34, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--color-text-primary)", marginBottom: 2 }}>Smart Leads</div>
                      <div style={{ fontSize: 10, color: "var(--color-text-muted)", lineHeight: 1.4 }}>Datos reales + IA + estrategia personalizada.</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom features row */}
              <div style={{
                borderTop: "1px solid rgba(114,85,180,0.1)", paddingTop: 16,
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
              }}>
                <FeatureItem bg="#0D9488" title="Datos precisos" desc="Algoritmos basados en casos reales."
                  icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                />
                <FeatureItem bg="#2563EB" title="Estrategia personalizada" desc="Recomendaciones adaptadas a tu negocio."
                  icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                />
                <FeatureItem bg="#DB2777" title="Resultados reales" desc="Proyecciones alcanzables y medibles."
                  icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/></svg>}
                />
                <FeatureItem bg="#D97706" title="Proyección dinámica" desc="Los resultados pueden variar según mercado."
                  icon={<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── History ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28, background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.15)", borderRadius: 16, padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <History size={15} color="var(--color-lavender)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>Historial de proyecciones</span>
          </div>
          <button onClick={loadHistory} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
            <RefreshCw size={12} /> Actualizar
          </button>
        </div>

        {histLoading ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-text-muted)", fontSize: 13, padding: "20px 0" }}>
            <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Cargando historial...
          </div>
        ) : history.length === 0 ? (
          <div style={{ padding: "28px 0", textAlign: "center", color: "#3a3550", fontSize: 13 }}>
            No hay proyecciones guardadas aún. Calcula tu primera proyección arriba.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {["Fecha", "Modo", "Tipo", "Dificultad", "Precio", "Inversión / Meta", "Ventas Est.", "Ingresos Est."].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 12px 10px", color: "var(--color-text-muted)", fontWeight: 700, fontSize: 10.5, letterSpacing: "0.07em", textTransform: "uppercase", borderBottom: "1px solid rgba(114,85,180,0.1)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((item) => {
                  const r: CalcResult = JSON.parse(item.result);
                  return (
                    <tr key={item.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-faint)" }}>{new Date(item.createdAt).toLocaleDateString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 10.5, fontWeight: 700, background: item.mode === "investment" ? "rgba(114,85,180,0.15)" : "rgba(250,117,83,0.12)", color: item.mode === "investment" ? "var(--color-violet-soft)" : "var(--color-coral)" }}>
                          {item.mode === "investment" ? "Inversión" : "Meta Ventas"}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{item.businessType} · {TICKET_LABELS[item.ticket]}</td>
                      <td style={{ padding: "10px 12px", color: DIFF_COLORS[item.difficulty], fontWeight: 600 }}>{DIFFICULTY_LABELS[item.difficulty]}</td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{fmtMoney(item.productPrice)}</td>
                      <td style={{ padding: "10px 12px", color: "var(--color-text-secondary)" }}>{fmtMoney(item.input)}</td>
                      <td style={{ padding: "10px 12px", color: "#4ade80", fontWeight: 700 }}>{fmt(r.sales[0])}–{fmt(r.sales[1])}</td>
                      <td style={{ padding: "10px 12px", color: "#4ade80", fontWeight: 700 }}>{fmtMoney(r.revenue[0])}–{fmtMoney(r.revenue[1])}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast ────────────────────────────────────────────────────── */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          padding: "12px 20px", borderRadius: 10,
          background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.3)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          fontSize: 13, fontWeight: 600, color: "var(--color-text-primary)",
          animation: "slideIn 0.3s ease",
        }}>
          {toast}
        </div>
      )}

      <style>{`
        input[type=number] { -moz-appearance: textfield; }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input::placeholder { color: #3a3550; }
        input:focus { border-color: rgba(114,85,180,0.5) !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
