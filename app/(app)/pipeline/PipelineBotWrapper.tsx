"use client";

import { useRouter }   from "next/navigation";
import PipelineBoard   from "@/components/bot/PipelineBoard";

export default function PipelineBotWrapper() {
  const router = useRouter();

  const handleSelectConv = (id: string) => {
    router.push(`/whatsapp?conv=${encodeURIComponent(id)}`);
  };

  return <PipelineBoard onSelectConv={handleSelectConv} />;
}
