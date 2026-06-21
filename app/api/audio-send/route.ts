import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, resolveConvId, enqueueMediaOutbox, LEGACY_COMPANY_ID } from "@/lib/bot-db";
import fs   from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const convId = req.nextUrl.searchParams.get("conv");
    console.log("[audio-send] conv:", convId);

    const id = convId ? await resolveConvId(companyId, convId) : null;
    if (!id) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });

    const audioMime = req.headers.get("X-Audio-Mime") || "audio/webm";
    const arrayBuf  = await req.arrayBuffer();
    const buffer    = Buffer.from(arrayBuf);
    console.log("[audio-send] bytes:", buffer.length, "mime:", audioMime);

    if (!buffer.length) {
      return NextResponse.json({ error: "Audio vacío" }, { status: 400 });
    }

    const mediaDir = path.join(process.cwd(), "data", "media");
    fs.mkdirSync(mediaDir, { recursive: true });

    const ext      = audioMime.includes("ogg") ? "ogg" : "webm";
    const filename = `audio_${Date.now()}.${ext}`;
    const filepath = path.join(mediaDir, filename);
    fs.writeFileSync(filepath, buffer);
    console.log("[audio-send] guardado:", filepath);

    const [conv] = await sql`SELECT phone, remote_jid FROM conversations WHERE id = ${id} AND company_id = ${companyId}`;
    console.log("[audio-send] conv encontrada:", JSON.stringify(conv));

    if (!(conv as any)?.phone) {
      console.warn("[audio-send] sin teléfono — borrando archivo");
      fs.unlinkSync(filepath);
      return NextResponse.json({ error: "Sin teléfono" }, { status: 400 });
    }

    const isPtt = audioMime.includes("opus") || audioMime.includes("ogg");
    console.log("[audio-send] encolando... isPtt:", isPtt);
    await enqueueMediaOutbox(companyId, id, (conv as any).phone, "audio", filepath, audioMime, isPtt);
    console.log("[audio-send] encolado para:", (conv as any).phone);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[audio-send] Error:", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
