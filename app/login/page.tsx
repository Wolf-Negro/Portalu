"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import LoginDashboardPreview from "@/components/login/LoginDashboardPreview";

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
      {/* ── LEFT: Login form ── */}
      <div
        className="flex-1 lg:max-w-[460px] flex flex-col items-center justify-between py-12 px-8"
        style={{ background: "#141420" }}
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

      {/* ── RIGHT: Product showcase (ocupa toda la columna derecha) ── */}
      <div
        className="hidden lg:block flex-1 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #f1f0fb 0%, #e8e6f7 100%)" }}
      >
        <div className="relative z-10 max-w-md pt-20 pl-16 pr-10">
          <h2 className="text-4xl font-bold leading-tight mb-5" style={{ color: "#1a1530" }}>
            Convierte tus campañas en{" "}
            <span style={{ color: "#7255b4" }}>decisiones.</span>
          </h2>
          <p className="text-sm" style={{ color: "#5a5577" }}>
            El centro de control comercial de Alucinando.
          </p>
        </div>

        <div
          className="absolute"
          style={{
            right: "-4%",
            top: "30%",
            width: "78%",
            perspective: "2000px",
          }}
        >
          <div style={{ transform: "rotateX(8deg) rotateY(-14deg) rotateZ(2deg)", transformStyle: "preserve-3d" }}>
            <LoginDashboardPreview />
          </div>
        </div>
      </div>
    </div>
  );
}
