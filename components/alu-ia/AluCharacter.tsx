export type AluMode = "idle" | "thinking" | "responding";

// ─── CSS global animations ────────────────────────────────────────────────────
// Compartidas por todos los puntos donde aparece el personaje de ALU.IA
// (página dedicada, botón flotante global, panel del Dashboard).

export const ALU_CHARACTER_STYLES = `
  @keyframes aluFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
    20%      { transform: translateY(-9px) rotate(-3deg) scale(1.015); }
    50%      { transform: translateY(-3px) rotate(0deg) scale(0.99); }
    75%      { transform: translateY(-10px) rotate(3deg) scale(1.015); }
  }
  @keyframes aluBreathe {
    0%, 100% { transform: scaleY(1) scaleX(1); }
    50%      { transform: scaleY(1.035) scaleX(0.985); }
  }
  @keyframes aluBlink {
    0%, 92%, 100% { transform: scaleY(1); opacity: 0; }
    94%            { transform: scaleY(1);    opacity: 1; }
    96%            { transform: scaleY(0.05); opacity: 1; }
    98%            { transform: scaleY(1);    opacity: 1; }
  }
  @keyframes aluThink {
    0%,100% { transform: translateY(0) scale(1)    rotate(0deg); }
    20%     { transform: translateY(-4px) scale(1.04) rotate(-2deg); }
    50%     { transform: translateY(-9px) scale(1.06) rotate(2deg); }
    80%     { transform: translateY(-4px) scale(1.04) rotate(-1deg); }
  }
  @keyframes aluRespond {
    0%   { transform: scale(1)    translateY(0) rotate(0deg); }
    20%  { transform: scale(1.15) translateY(-14px) rotate(-6deg); }
    45%  { transform: scale(0.92) translateY(3px) rotate(4deg); }
    65%  { transform: scale(1.08) translateY(-6px) rotate(-2deg); }
    85%  { transform: scale(0.98) translateY(1px) rotate(1deg); }
    100% { transform: scale(1)    translateY(0) rotate(0deg); }
  }
  @keyframes aluGlowIdle {
    0%,100% { opacity: 0.4; transform: scale(1);    }
    50%     { opacity: 0.8; transform: scale(1.15); }
  }
  @keyframes aluGlowThink {
    0%,100% { opacity: 0.7; transform: scale(1.1);  }
    50%     { opacity: 1;   transform: scale(1.35); }
  }
  @keyframes typingBounce {
    0%,80%,100% { transform: translateY(0);   opacity: 0.4; }
    40%         { transform: translateY(-6px); opacity: 1;   }
  }
  .alu-float   { animation: aluFloat   4.2s ease-in-out infinite; transform-origin: 50% 100%; }
  .alu-breathe { animation: aluBreathe 2.6s ease-in-out infinite; transform-origin: 50% 100%; }
  .alu-think   { animation: aluThink   0.75s ease-in-out infinite; }
  .alu-respond { animation: aluRespond 0.7s cubic-bezier(.36,1.6,.4,1) forwards; }
  .alu-blink   { animation: aluBlink   5.5s ease-in-out infinite; }
  .alu-wrap:hover .alu-float,
  .alu-wrap:hover .alu-breathe {
    animation-duration: 0.9s;
  }
  .typing-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--color-violet-soft);
    animation: typingBounce 1.1s ease-in-out infinite;
  }
`;

// ─── Alu Character ────────────────────────────────────────────────────────────
// Mascota completa de Alucinando (cuerpo entero, recortada con fondo
// transparente desde /alu-mascot.png — ver public/alu-persona.jpeg para el
// arte original con las 3 poses). Proporción real de la imagen: 460×741.
// El "parpadeo" es un overlay que simula el párpado sobre la pantalla-ojo
// (no hay capa separada del ojo en el arte original) ubicado por porcentaje
// sobre la zona de la pantalla.
const MASCOT_ASPECT = 741 / 460;

export function AluCharacter({
  size     = 130,
  mode     = "idle" as AluMode,
  noAnim   = false,
}: {
  size?:   number;
  mode?:   AluMode;
  noAnim?: boolean;
}) {
  const animClass = noAnim
    ? ""
    : mode === "thinking"   ? "alu-think"
    : mode === "responding" ? "alu-respond"
    : "alu-float";

  const glowAnim = mode === "thinking" ? "aluGlowThink" : "aluGlowIdle";
  const glowOpacity = mode === "thinking" ? 1 : 0.6;
  const height = Math.round(size * MASCOT_ASPECT);

  return (
    <div className="alu-wrap" style={{ position: "relative", width: size, height, flexShrink: 0 }}>
      {/* Glow externo */}
      <div style={{
        position:    "absolute",
        inset:       -size * 0.15,
        borderRadius: "50%",
        background:  mode === "thinking"
          ? "radial-gradient(circle, rgba(114,85,180,0.55) 0%, transparent 70%)"
          : "radial-gradient(circle, rgba(114,85,180,0.28) 0%, transparent 70%)",
        filter:      `blur(${size * 0.12}px)`,
        animation:   `${glowAnim} ${mode === "thinking" ? "0.75s" : "3.6s"} ease-in-out infinite`,
        opacity:     glowOpacity,
        pointerEvents: "none",
      }} />

      {/* Personaje (float = balanceo completo; breathe = respiración sutil dentro) */}
      <div className={animClass} style={{ width: "100%", height: "100%" }}>
        <div className={noAnim ? "" : "alu-breathe"} style={{ position: "relative", width: "100%", height: "100%" }}>
          <img
            src="/alu-mascot-sm.png"
            alt="Alu"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              imageRendering: "auto",
              filter: mode === "thinking"
                ? "drop-shadow(0 0 18px rgba(114,85,180,0.9)) brightness(1.1) contrast(1.08)"
                : "drop-shadow(0 0 10px rgba(114,85,180,0.5)) brightness(1.05) contrast(1.06)",
              transition: "filter 0.4s ease",
              pointerEvents: "none",
              display: "block",
            }}
          />
          {/* Párpado simulado sobre la pantalla-ojo */}
          {!noAnim && (
            <div
              className="alu-blink"
              style={{
                position: "absolute",
                left: "17.5%", width: "64%",
                top: "20.5%", height: "18.5%",
                background: "linear-gradient(180deg,#2a2156,#15102c)",
                borderRadius: "18%",
                transformOrigin: "50% 0%",
                pointerEvents: "none",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Avatar pequeño y circular (mensajes + input bar) — recorte de la cabeza.
export function AluAvatar({ size = 36 }: { size?: number }) {
  return (
    <div style={{
      width:              size,
      height:             size,
      borderRadius:       "50%",
      overflow:           "hidden",
      flexShrink:         0,
      border:             "2px solid rgba(114,85,180,0.55)",
      boxShadow:          "0 0 10px rgba(114,85,180,0.3)",
      background:         "var(--color-violet-dim)",
      backgroundImage:    "url(/alu-mascot-sm.png)",
      backgroundSize:     "155% auto",
      backgroundPosition: "50% 10%",
      backgroundRepeat:   "no-repeat",
    }} />
  );
}
