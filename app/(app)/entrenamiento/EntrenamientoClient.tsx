"use client";

import { useState } from "react";
import { GraduationCap, Play, CheckCircle, Clock, BookOpen, X, ChevronRight } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  ventas: "#7255b4",
  marketing: "#fa7553",
  metricas: "#3b82f6",
  comunicacion: "#22c55e",
  default: "#a09bbf",
};

interface Module {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  duration: number;
  order: number;
}

interface Progress {
  moduleId: string;
  completed: boolean;
  score?: number | null;
}

interface Props {
  modules: Module[];
  progress: Progress[];
  userId: string;
}

function ModuleModal({ module, onClose, onComplete }: {
  module: Module;
  onClose: () => void;
  onComplete: (moduleId: string, score: number) => void;
}) {
  const [step, setStep] = useState<"content" | "quiz">("content");
  const [score, setScore] = useState<number | null>(null);

  const questions = [
    { q: "¿Cuál es el objetivo principal de este módulo?", options: ["Optimizar conversiones", "Generar más leads", "Mejorar el equipo", "Reducir costos"], correct: 0 },
    { q: "¿Qué métrica es más importante para medir el éxito?", options: ["Número de leads", "Tasa de conversión", "ROAS", "Todas las anteriores"], correct: 3 },
  ];
  const [answers, setAnswers] = useState<Record<number, number>>({});

  function submitQuiz() {
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) correct++; });
    const pct = Math.round((correct / questions.length) * 100);
    setScore(pct);
    onComplete(module.id, pct);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.8)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl rounded-xl animate-slide-up flex flex-col"
        style={{ background: "#1a1a2e", border: "1px solid rgba(114,85,180,0.3)", maxHeight: "85vh" }}>

        <div className="flex items-center justify-between p-5 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg"
              style={{ background: `${CATEGORY_COLORS[module.category] || CATEGORY_COLORS.default}22` }}>
              <BookOpen size={14} style={{ color: CATEGORY_COLORS[module.category] || CATEGORY_COLORS.default }} />
            </div>
            <div>
              <h2 className="font-bold text-sm" style={{ color: "#e9e8e6" }}>{module.title}</h2>
              <p className="text-xs" style={{ color: "#5a5575" }}>{module.duration} min · {module.category}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "#5a5575" }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {score !== null ? (
            <div className="text-center py-8">
              <div className={`text-5xl font-bold mb-3`}
                style={{ color: score >= 70 ? "#22c55e" : "#ef4444" }}>
                {score}%
              </div>
              <p className="text-base font-semibold mb-2" style={{ color: "#e9e8e6" }}>
                {score >= 70 ? "¡Módulo completado!" : "Sigue practicando"}
              </p>
              <p className="text-sm" style={{ color: "#a09bbf" }}>
                Respondiste correctamente {Math.round((score / 100) * questions.length)} de {questions.length} preguntas
              </p>
              <button onClick={onClose}
                className="mt-6 px-6 py-2.5 rounded-xl text-sm font-medium"
                style={{ background: "linear-gradient(135deg, #2b096f, #7255b4)", color: "#e9e8e6" }}>
                Continuar
              </button>
            </div>
          ) : step === "content" ? (
            <>
              <div className="prose prose-sm max-w-none mb-6">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "#a09bbf" }}>
                  {module.content || module.description}
                </p>
              </div>
              <button
                onClick={() => setStep("quiz")}
                className="w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #2b096f, #7255b4)", color: "#e9e8e6" }}>
                Ir al Quiz
                <ChevronRight size={14} />
              </button>
            </>
          ) : (
            <>
              <h3 className="text-sm font-semibold mb-4" style={{ color: "#e9e8e6" }}>Quiz de evaluación</h3>
              {questions.map((q, qi) => (
                <div key={qi} className="mb-5">
                  <p className="text-sm font-medium mb-3" style={{ color: "#e9e8e6" }}>
                    {qi + 1}. {q.q}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => (
                      <button
                        key={oi}
                        onClick={() => setAnswers((prev) => ({ ...prev, [qi]: oi }))}
                        className="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all"
                        style={{
                          background: answers[qi] === oi ? "rgba(43,9,111,0.4)" : "rgba(26,26,46,0.6)",
                          border: `1px solid ${answers[qi] === oi ? "rgba(114,85,180,0.6)" : "rgba(114,85,180,0.15)"}`,
                          color: answers[qi] === oi ? "#e9e8e6" : "#a09bbf",
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button
                onClick={submitQuiz}
                disabled={Object.keys(answers).length < questions.length}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{
                  background: Object.keys(answers).length < questions.length
                    ? "rgba(114,85,180,0.2)"
                    : "linear-gradient(135deg, #2b096f, #7255b4)",
                  color: "#e9e8e6",
                  cursor: Object.keys(answers).length < questions.length ? "not-allowed" : "pointer",
                }}
              >
                Enviar respuestas
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function EntrenamientoClient({ modules, progress, userId }: Props) {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [localProgress, setLocalProgress] = useState<Record<string, Progress>>(
    Object.fromEntries(progress.map((p) => [p.moduleId, p]))
  );

  const completed = Object.values(localProgress).filter((p) => p.completed).length;
  const totalPct = modules.length > 0 ? Math.round((completed / modules.length) * 100) : 0;

  async function handleComplete(moduleId: string, score: number) {
    setLocalProgress((prev) => ({
      ...prev,
      [moduleId]: { moduleId, completed: true, score },
    }));
    await fetch("/api/training/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ moduleId, userId, score }),
    });
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {selectedModule && (
        <ModuleModal
          module={selectedModule}
          onClose={() => setSelectedModule(null)}
          onComplete={handleComplete}
        />
      )}

      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#e9e8e6" }}>Centro de Entrenamiento</h1>
        <p className="text-sm mt-0.5" style={{ color: "#a09bbf" }}>
          {completed} de {modules.length} módulos completados
        </p>
      </div>

      {/* Progress bar */}
      <div className="rounded-xl p-5"
        style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={16} style={{ color: "#7255b4" }} />
            <span className="text-sm font-semibold" style={{ color: "#e9e8e6" }}>Tu progreso general</span>
          </div>
          <span className="text-2xl font-bold" style={{ color: "#7255b4" }}>{totalPct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(114,85,180,0.15)" }}>
          <div className="h-full rounded-full transition-all"
            style={{ width: `${totalPct}%`, background: "linear-gradient(90deg, #2b096f, #7255b4)" }} />
        </div>
      </div>

      {/* Modules grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.map((mod) => {
          const prog = localProgress[mod.id];
          const isCompleted = prog?.completed;
          const color = CATEGORY_COLORS[mod.category] || CATEGORY_COLORS.default;
          return (
            <div
              key={mod.id}
              className="rounded-xl p-5 flex flex-col transition-all hover:scale-[1.01] cursor-pointer"
              style={{
                background: "rgba(22,22,42,0.8)",
                border: `1px solid ${isCompleted ? "rgba(34,197,94,0.3)" : "rgba(114,85,180,0.18)"}`,
              }}
              onClick={() => setSelectedModule(mod)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ background: `${color}22` }}>
                  <BookOpen size={14} style={{ color }} />
                </div>
                {isCompleted ? (
                  <div className="flex items-center gap-1 text-xs" style={{ color: "#22c55e" }}>
                    <CheckCircle size={12} />
                    {prog.score !== null && prog.score !== undefined && `${prog.score}%`}
                  </div>
                ) : (
                  <Play size={14} style={{ color: "#5a5575" }} />
                )}
              </div>

              <h3 className="text-sm font-semibold mb-1.5 leading-snug" style={{ color: "#e9e8e6" }}>
                {mod.title}
              </h3>
              <p className="text-xs mb-3 flex-1 leading-relaxed" style={{ color: "#a09bbf" }}>
                {mod.description}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: `${color}22`, color }}>
                  {mod.category}
                </span>
                <div className="flex items-center gap-1 text-xs" style={{ color: "#5a5575" }}>
                  <Clock size={10} />
                  {mod.duration} min
                </div>
              </div>
            </div>
          );
        })}

        {modules.length === 0 && (
          <div className="col-span-3 text-center py-12">
            <GraduationCap size={32} className="mx-auto mb-3" style={{ color: "#5a5575" }} />
            <p className="text-sm" style={{ color: "#5a5575" }}>Sin módulos de entrenamiento disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}
