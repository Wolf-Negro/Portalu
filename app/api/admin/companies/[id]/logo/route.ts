import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

function isSuperAdmin(session: any) {
  return session?.user && (session.user as any).role === "superadmin";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const formData = await req.formData();
  const file = formData.get("logo") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Tipo de archivo no permitido. Usa JPG, PNG, WEBP o SVG." }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "El archivo no puede superar 2MB" }, { status: 400 });
  }

  const ext = file.type === "image/svg+xml" ? "svg" : file.type.split("/")[1];
  // Filename con timestamp para invalidar caché de navegador/CDN al re-subir
  // un logo nuevo (antes se reusaba siempre el mismo nombre `<id>.<ext>`).
  const filename = `${id}-${Date.now()}.${ext}`;
  const logosDir = path.join(process.cwd(), "data", "logos");
  await mkdir(logosDir, { recursive: true });
  const filePath = path.join(logosDir, filename);

  const bytes = await file.arrayBuffer();
  await writeFile(filePath, Buffer.from(bytes));

  const logoUrl = `/api/media/logos/${filename}`;
  await prisma.company.update({ where: { id }, data: { logo: logoUrl } as any });

  return NextResponse.json({ logoUrl });
}
