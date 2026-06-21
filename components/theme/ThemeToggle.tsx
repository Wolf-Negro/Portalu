"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ size = 32 }: { size?: number }) {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <button
      onClick={toggleTheme}
      title={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
      aria-label="Cambiar tema"
      style={{
        width:        size,
        height:       size,
        borderRadius: "50%",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        flexShrink:   0,
        background:   isLight ? "rgba(217,119,6,0.12)" : "rgba(114,85,180,0.15)",
        border:       `1px solid ${isLight ? "rgba(217,119,6,0.35)" : "rgba(114,85,180,0.3)"}`,
        color:        isLight ? "#d97706" : "#9b82d4",
        cursor:       "pointer",
        transition:   "background 0.3s ease, border-color 0.3s ease, color 0.3s ease, transform 0.4s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = "rotate(20deg) scale(1.08)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "rotate(0deg) scale(1)"; }}
    >
      {isLight ? <Sun size={size * 0.5} /> : <Moon size={size * 0.5} />}
    </button>
  );
}
