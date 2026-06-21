"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { formatCurrency } from "@/lib/utils";
import { X, DollarSign, User, Phone } from "lucide-react";
import { useToast } from "@/components/ui/toast";

const STAGES = [
  { id: "nuevo_lead", label: "Nuevo Lead", color: "var(--color-lavender)" },
  { id: "contactado", label: "Contactado", color: "#3b82f6" },
  { id: "propuesta", label: "Propuesta", color: "var(--color-warning)" },
  { id: "negociacion", label: "Negociación", color: "var(--color-coral)" },
  { id: "cerrado_ganado", label: "Cerrado Ganado", color: "var(--color-success)" },
  { id: "cerrado_perdido", label: "Cerrado Perdido", color: "var(--color-danger)" },
];

interface Opportunity {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number;
  lead?: { name: string; phone?: string | null; email?: string | null; origin: string } | null;
  createdAt: Date | string;
}

interface Props {
  opportunities: Opportunity[];
  companyId: string;
}

function OpportunityCard({ opp, index }: { opp: Opportunity; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const stageColor = STAGES.find((s) => s.id === opp.stage)?.color || "var(--color-lavender)";
  return (
    <Draggable draggableId={opp.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={() => setExpanded(!expanded)}
          className="rounded-lg p-3 cursor-pointer transition-all"
          style={{
            background: snapshot.isDragging
              ? "rgba(43,9,111,0.6)"
              : "rgba(26,26,46,0.9)",
            border: `1px solid ${snapshot.isDragging ? "rgba(114,85,180,0.6)" : "rgba(114,85,180,0.18)"}`,
            borderLeft: `3px solid ${stageColor}`,
            boxShadow: snapshot.isDragging ? "0 8px 32px rgba(43,9,111,0.4)" : "0 2px 8px rgba(0,0,0,0.18)",
            userSelect: "none",
          }}
        >
          <p className="text-sm font-medium mb-1.5 leading-snug" style={{ color: "var(--color-text-primary)" }}>
            {opp.title}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: "var(--color-lavender)" }}>
              {formatCurrency(opp.value)}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "rgba(43,9,111,0.4)", color: "var(--color-text-secondary)" }}>
              {opp.probability}%
            </span>
          </div>
          {opp.lead && (
            <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid rgba(114,85,180,0.1)" }}>
              <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-text-secondary)" }}>
                <User size={10} style={{ color: "var(--color-lavender)" }} />
                {opp.lead.name}
              </p>
              {opp.lead.phone && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
                  <Phone size={10} />
                  {opp.lead.phone}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function PipelineClient({ opportunities, companyId }: Props) {
  const [items, setItems] = useState(opportunities);
  const [view, setView] = useState<"kanban" | "tabla">("kanban");
  const { showToast } = useToast();

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    const previousStage = source.droppableId;

    setItems((prev) =>
      prev.map((item) =>
        item.id === draggableId ? { ...item, stage: destination.droppableId } : item
      )
    );

    fetch("/api/opportunities/stage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draggableId, stage: destination.droppableId }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error al actualizar la etapa");
      })
      .catch(() => {
        setItems((prev) =>
          prev.map((item) =>
            item.id === draggableId ? { ...item, stage: previousStage } : item
          )
        );
        showToast("No se pudo mover la oportunidad. Intenta de nuevo.", "error");
      });
  }

  const byStage = STAGES.reduce((acc, stage) => {
    acc[stage.id] = items.filter((o) => o.stage === stage.id);
    return acc;
  }, {} as Record<string, Opportunity[]>);

  const stageTotal = (stageId: string) =>
    byStage[stageId].reduce((acc, o) => acc + o.value, 0);

  return (
    <div className="p-6 space-y-5 animate-fade-in h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--color-text-primary)" }}>Pipeline Comercial</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--color-text-secondary)" }}>
            {items.length} oportunidades · {formatCurrency(items.reduce((a, o) => a + o.value, 0))} total
          </p>
        </div>
        <div className="flex gap-2">
          {(["kanban", "tabla"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
              style={{
                background: view === v ? "rgba(114,85,180,0.3)" : "var(--color-surface-glass)",
                border: `1px solid ${view === v ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.2)"}`,
                color: view === v ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              }}
            >
              {v === "kanban" ? "Kanban" : "Tabla"}
            </button>
          ))}
        </div>
      </div>

      {view === "kanban" ? (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-4 flex-1">
            {STAGES.map((stage) => (
              <div
                key={stage.id}
                className="flex-shrink-0 flex flex-col rounded-xl overflow-hidden"
                style={{
                  width: 240,
                  background: "var(--color-surface-glass)",
                  border: "1px solid rgba(114,85,180,0.15)",
                  borderTop: `3px solid ${stage.color}`,
                }}
              >
                {/* Column header */}
                <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(114,85,180,0.12)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>
                        {stage.label}
                      </span>
                    </div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: `color-mix(in srgb, ${stage.color} 13%, transparent)`, color: stage.color }}
                    >
                      {byStage[stage.id].length}
                    </span>
                  </div>
                  <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
                    {formatCurrency(stageTotal(stage.id))}
                  </p>
                </div>

                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 p-2 space-y-2 overflow-y-auto min-h-24 transition-colors"
                      style={{
                        background: snapshot.isDraggingOver
                          ? "rgba(114,85,180,0.05)"
                          : "transparent",
                        minHeight: 80,
                      }}
                    >
                      {byStage[stage.id].map((opp, index) => (
                        <OpportunityCard key={opp.id} opp={opp} index={index} />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      ) : (
        <div className="rounded-xl overflow-hidden"
          style={{ background: "var(--color-surface-glass)", border: "1px solid rgba(114,85,180,0.18)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
                {["Oportunidad", "Lead", "Etapa", "Valor", "Probabilidad", "Fecha"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--color-text-muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((opp, i) => {
                const stage = STAGES.find((s) => s.id === opp.stage);
                return (
                  <tr key={opp.id}
                    style={{ borderBottom: i < items.length - 1 ? "1px solid rgba(114,85,180,0.08)" : "none" }}>
                    <td className="px-4 py-3.5 font-medium" style={{ color: "var(--color-text-primary)" }}>{opp.title}</td>
                    <td className="px-4 py-3.5" style={{ color: "var(--color-text-secondary)" }}>{opp.lead?.name || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${stage?.color}22`, color: stage?.color }}>
                        {stage?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium" style={{ color: "var(--color-lavender)" }}>
                      {formatCurrency(opp.value)}
                    </td>
                    <td className="px-4 py-3.5" style={{ color: "var(--color-text-secondary)" }}>{opp.probability}%</td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {new Date(opp.createdAt).toLocaleDateString("es-PE")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
