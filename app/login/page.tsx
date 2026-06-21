"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    if (res?.error) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#0e0e14" }}>
      {/* ── LEFT: Cosmic portal ── */}
      <div
        className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden"
        style={{ background: "radial-gradient(ellipse at 60% 50%, #1a0a3a 0%, #0e0e14 70%)" }}
      >
        {/* Floating diagonal brand shapes */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute animate-lightning-float"
            style={{
              top: "-10%", left: "-12%", width: "50%", height: "65%",
              background: "linear-gradient(135deg, rgba(114,85,180,0.1) 0%, transparent 65%)",
              clipPath: "polygon(30% 0%, 100% 0%, 70% 100%, 0% 100%)",
              transform: "rotate(-20deg)",
              "--r": "-20deg",
            } as React.CSSProperties}
          />
          <div
            className="absolute animate-lightning-float"
            style={{
              bottom: "-8%", right: "-8%", width: "45%", height: "55%",
              background: "linear-gradient(315deg, rgba(250,117,83,0.07) 0%, transparent 65%)",
              clipPath: "polygon(0% 0%, 70% 0%, 100% 100%, 30% 100%)",
              transform: "rotate(15deg)",
              animationDelay: "1.8s",
              "--r": "15deg",
            } as React.CSSProperties}
          />
          <div
            className="absolute animate-lightning-float"
            style={{
              top: "55%", left: "8%", width: "18%", height: "22%",
              background: "linear-gradient(135deg, rgba(114,85,180,0.08) 0%, transparent 80%)",
              transform: "rotate(-40deg)",
              animationDelay: "3.2s",
              "--r": "-40deg",
            } as React.CSSProperties}
          />
        </div>

        {/* Portal rings */}
        <div className="relative flex items-center justify-center z-10">
          {/* Outermost glow halo */}
          <div className="absolute" style={{
            width: 420, height: 420, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(114,85,180,0.06) 0%, transparent 70%)",
          }} />
          {/* Ring 1 - slow */}
          <div className="absolute animate-portal-spin-slow" style={{
            width: 370, height: 370, borderRadius: "50%",
            border: "1px solid rgba(114,85,180,0.2)",
            borderTopColor: "rgba(114,85,180,0.65)",
            borderRightColor: "transparent",
          }} />
          {/* Ring 2 */}
          <div className="absolute animate-portal-spin" style={{
            width: 300, height: 300, borderRadius: "50%",
            border: "1.5px solid rgba(114,85,180,0.3)",
            borderBottomColor: "rgba(250,117,83,0.55)",
            borderLeftColor: "transparent",
          }} />
          {/* Ring 3 reverse */}
          <div className="absolute animate-portal-spin-reverse" style={{
            width: 230, height: 230, borderRadius: "50%",
            border: "1.5px solid rgba(114,85,180,0.45)",
            borderTopColor: "rgba(233,232,230,0.45)",
            borderRightColor: "transparent",
          }} />
          {/* Ring 4 fast */}
          <div className="absolute animate-portal-spin" style={{
            width: 156, height: 156, borderRadius: "50%",
            border: "1px solid rgba(250,117,83,0.25)",
            borderBottomColor: "rgba(250,117,83,0.75)",
            borderLeftColor: "transparent",
            animationDuration: "4s",
          }} />

          {/* Core */}
          <div className="animate-portal-pulse relative flex items-center justify-center" style={{
            width: 96, height: 96, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(114,85,180,0.35) 0%, rgba(43,9,111,0.15) 60%, transparent 100%)",
          }}>
            <Image
              src="/isotype.svg"
              alt="Alucinando"
              width={48}
              height={48}
              style={{ filter: "drop-shadow(0 0 14px rgba(114,85,180,0.9)) drop-shadow(0 0 4px rgba(114,85,180,0.6))" }}
            />
          </div>
        </div>

        {/* Tagline */}
        <div className="absolute bottom-10 left-0 right-0 text-center z-10">
          <p className="text-xs tracking-[0.3em] uppercase" style={{ color: "rgba(160,155,191,0.6)" }}>
            Marketing · Ventas · Inteligencia Artificial
          </p>
        </div>
      </div>

      {/* ── RIGHT: Login form ── */}
      <div
        className="flex-1 lg:max-w-[460px] flex flex-col items-center justify-between py-12 px-8"
        style={{ background: "#141420", borderLeft: "1px solid rgba(114,85,180,0.12)" }}
      >
        <div />

        <div className="w-full max-w-sm animate-slide-up">
          {/* Logo */}
          <div className="mb-10 flex items-center gap-3">
            <Image
              src="/isotype.svg"
              alt="Alucinando"
              width={32}
              height={32}
              style={{ filter: "drop-shadow(0 0 8px rgba(114,85,180,0.6))" }}
            />
            <div>
              <div className="text-xl font-bold tracking-tight leading-none" style={{ color: "#e9e8e6" }}>
                PORTALU
              </div>
              <div className="text-[10px] tracking-[0.18em] mt-0.5" style={{ color: "rgba(114,85,180,0.8)" }}>
                by Alucinando
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1" style={{ color: "#e9e8e6" }}>Bienvenido de vuelta</h1>
          <p className="text-sm mb-8" style={{ color: "#a09bbf" }}>Ingresa tus credenciales para continuar</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "#a09bbf" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{ background: "rgba(43,9,111,0.12)", border: "1px solid rgba(114,85,180,0.25)", color: "#e9e8e6" }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(114,85,180,0.65)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(114,85,180,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(114,85,180,0.25)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 uppercase tracking-wider" style={{ color: "#a09bbf" }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{ background: "rgba(43,9,111,0.12)", border: "1px solid rgba(114,85,180,0.25)", color: "#e9e8e6" }}
                onFocus={(e) => {
                  e.target.style.borderColor = "rgba(114,85,180,0.65)";
                  e.target.style.boxShadow = "0 0 0 3px rgba(114,85,180,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "rgba(114,85,180,0.25)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {error && (
              <div className="text-xs px-3 py-2.5 rounded-lg"
                style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-all mt-2"
              style={{
                background: loading
                  ? "rgba(114,85,180,0.35)"
                  : "linear-gradient(135deg, #2b096f 0%, #7255b4 100%)",
                color: "#e9e8e6",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 24px rgba(43,9,111,0.45)",
              }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>

        <p className="text-[11px] text-center" style={{ color: "rgba(90,85,117,0.75)" }}>
          PORTALU.PE · PLATAFORMA INTERNA · ALUCINANDO SOFTWARE © 2025
        </p>
      </div>
    </div>
  );
}
