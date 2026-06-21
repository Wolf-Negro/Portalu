import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const { conversationId } = await params;
    const jid = decodeURIComponent(conversationId);

    await sql.begin(async (tx) => {
      await tx`DELETE FROM outbox   WHERE phone           = ${jid} AND company_id = ${companyId}`;
      await tx`
        DELETE FROM messages WHERE conversation_id = ${jid}
        AND conversation_id IN (SELECT id FROM conversations WHERE company_id = ${companyId})
      `;
      await tx`DELETE FROM conversations WHERE id = ${jid} AND company_id = ${companyId}`;
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Delete Conversation Error:", error);
    return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 });
  }
}
