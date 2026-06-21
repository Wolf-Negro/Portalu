import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, resolveConvId, enqueueMediaOutbox, LEGACY_COMPANY_ID } from "@/lib/bot-db";
import fs   from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const { conversationId } = await params;
    console.log("[media-api] conversationId recibido:", conversationId);

    const id = await resolveConvId(companyId, conversationId);
    console.log("[media-api] id resuelto:", id);
    if (!id) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

    const audioMime = req.headers.get("X-Audio-Mime") || "audio/webm";
    const arrayBuf  = await req.arrayBuffer();
    const buffer    = Buffer.from(arrayBuf);
    console.log("[media-api] audio recibido:", buffer.length, "bytes —", audioMime);

    if (!buffer.length) {
      return NextResponse.json({ error: "Audio vacío" }, { status: 400 });
    }

    const mediaDir = path.join(process.cwd(), "data", "media");
    fs.mkdirSync(mediaDir, { recursive: true });

    const isOgg    = audioMime.includes("ogg");
    const ext      = isOgg ? "ogg" : "webm";
    const filename = `audio_${Date.now()}.${ext}`;
    const filepath = path.join(mediaDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log("[media-api] archivo guardado:", filepath);

    const [conv] = await sql`
      SELECT phone, remote_jid FROM conversations WHERE id = ${id} AND company_id = ${companyId}
    `;

    if (!(conv as any)?.phone) {
      fs.unlinkSync(filepath);
      return NextResponse.json({ error: "Sin teléfono asociado" }, { status: 400 });
    }

    const isPtt = isOgg;
    await enqueueMediaOutbox(companyId, id, (conv as any).phone, "audio", filepath, audioMime, isPtt);
    console.log("[media-api] encolado — ptt:", isPtt, "→ phone:", (conv as any).phone);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[media-api] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
