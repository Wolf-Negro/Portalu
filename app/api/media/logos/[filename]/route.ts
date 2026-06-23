import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Los logos de empresa se guardan en data/logos/ (no en public/) porque
// public/ es parte del código desplegado y se reemplaza en cada deploy —
// data/ se preserva manualmente entre despliegues (igual que auth/ y los
// medios del bot). Ver app/api/admin/companies/[id]/logo/route.ts.
//
// Sin auth a propósito: el logo se renderiza con next/image (<Image>), cuyo
// optimizador interno hace un fetch server-a-server que NO reenvía cookies
// de sesión — y un logo de marca no es información sensible que requiera
// protegerse como los medios de WhatsApp.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  if (!filename || /[/\\.]\./.test(filename) || filename.includes("..")) {
    return NextResponse.json({ error: "Nombre de archivo inválido" }, { status: 400 });
  }

  const filepath = path.join(process.cwd(), "data", "logos", filename);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".webp": "image/webp",
    ".svg":  "image/svg+xml",
  };
  const contentType = mimeMap[ext] ?? "image/png";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":  contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
