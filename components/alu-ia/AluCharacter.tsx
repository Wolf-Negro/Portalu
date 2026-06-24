export type AluMode = "idle" | "thinking" | "responding";

// ─── CSS global animations ────────────────────────────────────────────────────
// Compartidas por todos los puntos donde aparece el personaje de ALU.IA
// (página dedicada, botón flotante global, panel del Dashboard).

export const ALU_CHARACTER_STYLES = `
  @keyframes aluFloat {
    0%, 100% { transform: translateY(0px) rotate(0deg); }
    25%       { transform: translateY(-7px) rotate(-1deg); }
    75%       { transform: translateY(-4px) rotate(1deg); }
  }
  @keyframes aluThink {
    0%,100% { transform: translateY(0) scale(1)    rotate(0deg); }
    20%     { transform: translateY(-4px) scale(1.04) rotate(-2deg); }
    50%     { transform: translateY(-9px) scale(1.06) rotate(2deg); }
    80%     { transform: translateY(-4px) scale(1.04) rotate(-1deg); }
  }
  @keyframes aluRespond {
    0%   { transform: scale(1)    translateY(0); }
    30%  { transform: scale(1.12) translateY(-10px); }
    60%  { transform: scale(0.95) translateY(2px); }
    80%  { transform: scale(1.05) translateY(-4px); }
    100% { transform: scale(1)    translateY(0); }
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
  .alu-float   { animation: aluFloat   3.6s ease-in-out infinite; }
  .alu-think   { animation: aluThink   0.75s ease-in-out infinite; }
  .alu-respond { animation: aluRespond 0.55s ease-out forwards; }
  .typing-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--color-violet-soft);
    animation: typingBounce 1.1s ease-in-out infinite;
  }
`;

// ─── Alu Character ────────────────────────────────────────────────────────────
// Muestra solo el personaje del frente (tercio izquierdo de la imagen).
// Usa background-image + mask radial para eliminar el fondo blanco.

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

  // El personaje principal ocupa el ~33% izquierdo de la imagen (1320×880px).
  // backgroundSize: 295% → imagen mostrada = size*2.95 ≈ cubre el 1/3 izquierdo.
  // backgroundPosition: 0% 0% → empieza desde la esquina superior izquierda.
  const height = Math.round(size * 1.35);

  return (
    <div style={{ position: "relative", width: size, height, flexShrink: 0 }}>
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

      {/* Personaje */}
      <div
        className={animClass}
        style={{
          width:          "100%",
          height:         "100%",
          backgroundImage:    "url(/alu-persona.jpeg)",
          backgroundSize:     "295% auto",
          backgroundPosition: "1.5% 0%",
          backgroundRepeat:   "no-repeat",
          // Máscara elíptica suave → elimina el fondo blanco en los bordes
          maskImage:          "radial-gradient(ellipse 78% 88% at 50% 38%, black 48%, transparent 78%)",
          WebkitMaskImage:    "radial-gradient(ellipse 78% 88% at 50% 38%, black 48%, transparent 78%)",
          filter: mode === "thinking"
            ? "drop-shadow(0 0 18px rgba(114,85,180,0.9)) brightness(1.08)"
            : "drop-shadow(0 0 10px rgba(114,85,180,0.5))",
          transition: "filter 0.4s ease",
          cursor: "default",
        }}
      />
    </div>
  );
}

// Avatar pequeño (mensajes + input bar)
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
      backgroundImage:    "url(/alu-persona.jpeg)",
      backgroundSize:     "295% auto",
      backgroundPosition: "2% 5%",
      backgroundRepeat:   "no-repeat",
    }} />
  );
}
