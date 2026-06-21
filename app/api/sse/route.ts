import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getEventsSince, LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic  = "force-dynamic";
export const runtime  = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // companyId siempre se deriva de la sesión, nunca de un parámetro del cliente.
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  const url    = req.nextUrl;
  let   lastId = parseInt(url.searchParams.get("since") ?? "0", 10);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": connected\n\nretry: 2000\n\n"));

      let ticking = false;

      const tick = setInterval(async () => {
        if (ticking) return;
        ticking = true;
        try {
          const events = await getEventsSince(companyId, lastId);

          if (events.length > 0) {
            for (const ev of events) {
              lastId = ev.id;
              const line =
                `id: ${ev.id}\n` +
                `data: ${JSON.stringify({ id: ev.id, type: ev.type, payload: JSON.parse(ev.payload) })}\n\n`;
              controller.enqueue(encoder.encode(line));
            }
          } else {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          }
        } catch {
          // DB puede estar ocupada momentáneamente; ignorar y reintentar
        } finally {
          ticking = false;
        }
      }, 300);

      req.signal.addEventListener("abort", () => {
        clearInterval(tick);
        try { controller.close(); } catch { /* ya cerrado */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":      "text/event-stream; charset=utf-8",
      "Cache-Control":     "no-cache, no-transform",
      "Connection":        "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
