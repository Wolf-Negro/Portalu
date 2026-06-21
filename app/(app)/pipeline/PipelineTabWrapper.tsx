"use client";

import { useState }    from "react";
import PipelineClient  from "./PipelineClient";
import PipelineBoard   from "@/components/bot/PipelineBoard";

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

const TABS = [
  { id: "crm",   label: "Oportunidades CRM" },
  { id: "leads", label: "Pipeline Leads Bot" },
] as const;

type Tab = typeof TABS[number]["id"];

export default function PipelineTabWrapper({ opportunities, companyId }: Props) {
  const [tab, setTab] = useState<Tab>("crm");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar — misma estética que el resto de Portalu */}
      <div className="shrink-0 px-6 pt-5 pb-0 flex gap-2 border-b"
           style={{ background: "var(--color-surface-0)", borderColor: "rgba(114,85,180,0.18)" }}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="px-5 py-2 rounded-t-lg text-xs font-semibold transition-all"
            style={
              tab === id
                ? { background: "rgba(114,85,180,0.15)", color: "var(--color-text-primary)",
                    borderBottom: "2px solid var(--color-lavender)" }
                : { color: "var(--color-text-muted)", borderBottom: "2px solid transparent" }
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === "crm"   && <PipelineClient opportunities={opportunities} companyId={companyId} />}
        {tab === "leads" && <PipelineBoard onSelectConv={() => {}} />}
      </div>
    </div>
  );
}
