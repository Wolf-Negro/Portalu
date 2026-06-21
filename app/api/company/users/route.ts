import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session   = await auth();
  const role      = (session?.user as any)?.role as string;
  const companyId = (session?.user as any)?.companyId as string | undefined;
  if (!companyId || role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, email, password, userRole } = await req.json();
  if (!name || !email || !password)
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: userRole || "asesor", companyId },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return NextResponse.json(user, { status: 201 });
}
