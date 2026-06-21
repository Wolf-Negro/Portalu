import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  // proxy.ts excluye rutas terminadas en extensión de imagen (para servir assets
  // estáticos sin auth), así que esta ruta dinámica queda fuera del middleware
  // y necesita su propia verificación de sesión.
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;

  if (!filename || /[/\\.]\./.test(filename) || filename.includes("..")) {
    return NextResponse.json({ error: "Nombre de archivo inválido" }, { status: 400 });
  }

  const filepath = path.join(process.cwd(), "data", "media", "images", filename);

  if (!fs.existsSync(filepath)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filepath);
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg":  "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png":  "image/png",
    ".gif":  "image/gif",
    ".webp": "image/webp",
  };
  const contentType = mimeMap[ext] ?? "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":  contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
