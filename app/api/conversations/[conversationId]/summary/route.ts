import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateAiSummary, LEGACY_COMPANY_ID } from "@/lib/bot-db";
import { generateAiSummary } from "@/lib/bot-openai";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const { conversationId: id } = await params;

    const summary = await generateAiSummary(companyId, id);
    if (!summary) {
      return NextResponse.json({ error: "No se pudo generar el resumen" }, { status: 500 });
    }

    await updateAiSummary(companyId, id, summary);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("[API summary] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
