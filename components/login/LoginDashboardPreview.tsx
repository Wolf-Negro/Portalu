// Vista previa decorativa del dashboard para la pantalla de login.
// Recreada en HTML/CSS/SVG (no es una captura) para que se vea nítida a
// cualquier resolución, en vez de depender de una imagen rasterizada.

function Sparkline({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 100 28" width="100%" height="28" preserveAspectRatio="none">
      <polyline
        points="0,22 14,18 28,20 42,12 56,15 70,7 84,9 100,2"
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const METRIC_CARDS = [
  { label: "Leads totales", value: "1,250", delta: "+18.8% vs. mes anterior", color: "#7255b4" },
  { label: "Oportunidades", value: "320", delta: "+12.4% vs. mes anterior", color: "#7255b4" },
  { label: "Ventas cerradas", value: "85", delta: "+15.7% vs. mes anterior", color: "#22c55e" },
  { label: "Ingresos", value: "S/ 85,480", delta: "+20.3% vs. mes anterior", color: "#22c55e" },
];

const NAV_ITEMS = ["Resumen", "Campañas", "Leads", "Oportunidades", "Clientes", "Reportes", "Automatizaciones", "Configuración"];

const FUNNEL_STEPS = [
  { label: "Nuevos leads", value: "1,250", pct: 100 },
  { label: "Contactados / Calificados", value: "850", pct: 68 },
  { label: "Propuesta", value: "210", pct: 17 },
  { label: "Cerrados", value: "85", pct: 7 },
];

const ACTIVITY = [
  { icon: "📘", text: "Nuevo lead desde Facebook Ads", time: "Hace 5 min", color: "#1877f2" },
  { icon: "🔄", text: "Oportunidad actualizada a Propuesta", time: "Hace 1 h", color: "#7255b4" },
  { icon: "✅", text: "Nueva venta cerrada", time: "Hace 3 h", color: "#22c55e" },
  { icon: "📣", text: "Campaña publicada: Verano 2025", time: "Hace 5 h", color: "#f59e0b" },
];

const SOURCES = [
  { label: "Meta Ads", pct: 40, color: "#7255b4" },
  { label: "Google Ads", pct: 30, color: "#5b8def" },
  { label: "Orgánico", pct: 20, color: "#22c55e" },
  { label: "Referidos", pct: 10, color: "#f59e0b" },
];

function DonutChart() {
  let acc = 0;
  const stops = SOURCES.map((s) => {
    const start = acc;
    acc += s.pct;
    return `${s.color} ${start}% ${acc}%`;
  }).join(", ");

  return (
    <div
      style={{
        width: 120, height: 120, borderRadius: "50%",
        background: `conic-gradient(${stops})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <div style={{
        width: 76, height: 76, borderRadius: "50%", background: "#fff",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a1530" }}>1,250</div>
        <div style={{ fontSize: 9, color: "#8b85a8" }}>Leads</div>
      </div>
    </div>
  );
}

export default function LoginDashboardPreview() {
  return (
    <div
      style={{
        width: "100%",
        background: "#fff",
        borderRadius: 16,
        boxShadow: "0 30px 90px rgba(43,9,111,0.22), 0 4px 18px rgba(43,9,111,0.1)",
        overflow: "hidden",
        display: "flex",
        fontFamily: "inherit",
      }}
    >
      {/* Sidebar */}
      <div style={{ width: 150, flexShrink: 0, background: "#fafafd", borderRight: "1px solid #eee9f7", padding: "18px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
          <img src="/isotype.svg" alt="" width={20} height={20} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 12, fontWeight: 800, color: "#1a1530", letterSpacing: "-0.02em" }}>PORTALU</span>
        </div>
        {NAV_ITEMS.map((item, i) => (
          <div
            key={item}
            style={{
              fontSize: 10.5, padding: "7px 8px", borderRadius: 6, marginBottom: 2,
              color: i === 0 ? "#7255b4" : "#6b6585",
              background: i === 0 ? "rgba(114,85,180,0.1)" : "transparent",
              fontWeight: i === 0 ? 700 : 500,
              whiteSpace: "nowrap",
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: "18px 20px", minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a1530" }}>Resumen general</span>
          <span style={{ fontSize: 9.5, color: "#8b85a8", border: "1px solid #e8e6f2", borderRadius: 6, padding: "3px 8px" }}>
            01 may. – 31 may.
          </span>
        </div>

        {/* Metric cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 12 }}>
          {METRIC_CARDS.map((m) => (
            <div key={m.label} style={{ border: "1px solid #eee9f7", borderRadius: 10, padding: "10px 11px" }}>
              <div style={{ fontSize: 9, color: "#8b85a8", marginBottom: 4 }}>{m.label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#1a1530" }}>{m.value}</div>
              <div style={{ fontSize: 8, color: "#22c55e", margin: "2px 0 4px" }}>{m.delta}</div>
              <Sparkline color={m.color} />
            </div>
          ))}
        </div>

        {/* Evolution + Donut */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10, marginBottom: 12 }}>
          <div style={{ border: "1px solid #eee9f7", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1530", marginBottom: 8 }}>Evolución de leads</div>
            <svg viewBox="0 0 280 90" width="100%" height="90" preserveAspectRatio="none">
              <polyline
                points="0,75 40,68 80,72 120,50 160,55 200,30 240,38 280,10"
                fill="none" stroke="#7255b4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              />
              <circle cx="200" cy="30" r="4" fill="#7255b4" />
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#a8a3bd", marginTop: 2 }}>
              <span>1 may.</span><span>8 may.</span><span>15 may.</span><span>22 may.</span><span>31 may.</span>
            </div>
          </div>

          <div style={{ border: "1px solid #eee9f7", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1530", marginBottom: 8 }}>Leads por fuente</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1 }}>
              <DonutChart />
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {SOURCES.map((s) => (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 9, color: "#6b6585" }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block" }} />
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Funnel + Activity */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 10 }}>
          <div style={{ border: "1px solid #eee9f7", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1530", marginBottom: 10 }}>Embudo de ventas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {FUNNEL_STEPS.map((f) => (
                <div key={f.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#6b6585", marginBottom: 3 }}>
                    <span>{f.label}</span>
                    <span style={{ fontWeight: 700, color: "#1a1530" }}>{f.value}</span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: "#f1eef9" }}>
                    <div style={{ height: "100%", width: `${f.pct}%`, borderRadius: 3, background: "linear-gradient(90deg,#7255b4,#a78bda)" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ border: "1px solid #eee9f7", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#1a1530", marginBottom: 10 }}>Actividad reciente</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {ACTIVITY.map((a) => (
                <div key={a.text} style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 5, fontSize: 10, flexShrink: 0,
                    background: `${a.color}1a`, display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {a.icon}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 9, color: "#1a1530", lineHeight: 1.3 }}>{a.text}</div>
                    <div style={{ fontSize: 8, color: "#a8a3bd" }}>{a.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
