"use client";

import { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { formatCurrency } from "@/lib/utils";
import { X, DollarSign, User, Phone } from "lucide-react";

const STAGES = [
  { id: "nuevo_lead", label: "Nuevo Lead", color: "#7255b4" },
  { id: "contactado", label: "Contactado", color: "#3b82f6" },
  { id: "propuesta", label: "Propuesta", color: "#f59e0b" },
  { id: "negociacion", label: "Negociación", color: "#fa7553" },
  { id: "cerrado_ganado", label: "Cerrado Ganado", color: "#22c55e" },
  { id: "cerrado_perdido", label: "Cerrado Perdido", color: "#ef4444" },
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
            boxShadow: snapshot.isDragging ? "0 8px 32px rgba(43,9,111,0.4)" : "none",
            userSelect: "none",
          }}
        >
          <p className="text-sm font-medium mb-1.5 leading-snug" style={{ color: "#e9e8e6" }}>
            {opp.title}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold" style={{ color: "#7255b4" }}>
              {formatCurrency(opp.value)}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded"
              style={{ background: "rgba(43,9,111,0.4)", color: "#a09bbf" }}>
              {opp.probability}%
            </span>
          </div>
          {opp.lead && (
            <div className="mt-2 pt-2 space-y-1" style={{ borderTop: "1px solid rgba(114,85,180,0.1)" }}>
              <p className="text-xs flex items-center gap-1.5" style={{ color: "#a09bbf" }}>
                <User size={10} style={{ color: "#7255b4" }} />
                {opp.lead.name}
              </p>
              {opp.lead.phone && (
                <p className="text-xs flex items-center gap-1.5" style={{ color: "#5a5575" }}>
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

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === draggableId ? { ...item, stage: destination.droppableId } : item
      )
    );

    fetch("/api/opportunities/stage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: draggableId, stage: destination.droppableId }),
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
          <h1 className="text-2xl font-bold" style={{ color: "#e9e8e6" }}>Pipeline Comercial</h1>
          <p className="text-sm mt-0.5" style={{ color: "#a09bbf" }}>
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
                background: view === v ? "rgba(114,85,180,0.3)" : "rgba(22,22,42,0.8)",
                border: `1px solid ${view === v ? "rgba(114,85,180,0.5)" : "rgba(114,85,180,0.2)"}`,
                color: view === v ? "#e9e8e6" : "#a09bbf",
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
                className="flex-shrink-0 flex flex-col rounded-xl"
                style={{
                  width: 240,
                  background: "rgba(14,14,20,0.6)",
                  border: "1px solid rgba(114,85,180,0.15)",
                }}
              >
                {/* Column header */}
                <div className="p-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(114,85,180,0.12)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: stage.color }} />
                      <span className="text-xs font-semibold" style={{ color: "#e9e8e6" }}>
                        {stage.label}
                      </span>
                    </div>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={{ background: `${stage.color}22`, color: stage.color }}
                    >
                      {byStage[stage.id].length}
                    </span>
                  </div>
                  <p className="text-xs font-medium" style={{ color: "#5a5575" }}>
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
          style={{ background: "rgba(22,22,42,0.8)", border: "1px solid rgba(114,85,180,0.18)" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(114,85,180,0.15)" }}>
                {["Oportunidad", "Lead", "Etapa", "Valor", "Probabilidad", "Fecha"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "#5a5575" }}>
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
                    <td className="px-4 py-3.5 font-medium" style={{ color: "#e9e8e6" }}>{opp.title}</td>
                    <td className="px-4 py-3.5" style={{ color: "#a09bbf" }}>{opp.lead?.name || "—"}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: `${stage?.color}22`, color: stage?.color }}>
                        {stage?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium" style={{ color: "#7255b4" }}>
                      {formatCurrency(opp.value)}
                    </td>
                    <td className="px-4 py-3.5" style={{ color: "#a09bbf" }}>{opp.probability}%</td>
                    <td className="px-4 py-3.5 text-xs" style={{ color: "#5a5575" }}>
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
