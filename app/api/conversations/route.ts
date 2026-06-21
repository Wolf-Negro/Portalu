import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const conversations = await sql`
      SELECT * FROM conversations WHERE company_id = ${companyId} ORDER BY last_message_at DESC
    `;

    return NextResponse.json(conversations.map((c: any) => ({
      ...c,
      metadata:     JSON.parse(c.metadata || "{}"),
      tags:         JSON.parse(c.tags     || "[]"),
      lead_scoring: c.lead_scoring ?? 0,
      ai_summary:   c.ai_summary   ?? null,
    })));
  } catch (error) {
    console.error("API Conversations Error:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}
