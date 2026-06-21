import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session   = await auth();
  const role      = (session?.user as any)?.role as string;
  const companyId = (session?.user as any)?.companyId as string | undefined;
  const myId      = (session?.user as any)?.id as string;
  if (!companyId || role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  if (userId === myId) return NextResponse.json({ error: "No puedes editarte a ti mismo" }, { status: 400 });

  const target = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const { name, userRole } = await req.json();
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name     ? { name }           : {}),
      ...(userRole ? { role: userRole } : {}),
    },
    select: { id: true, name: true, email: true, role: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session   = await auth();
  const role      = (session?.user as any)?.role as string;
  const companyId = (session?.user as any)?.companyId as string | undefined;
  const myId      = (session?.user as any)?.id as string;
  if (!companyId || role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { userId } = await params;
  if (userId === myId) return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });

  const target = await prisma.user.findFirst({ where: { id: userId, companyId } });
  if (!target) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  await prisma.user.delete({ where: { id: userId } });
  return NextResponse.json({ success: true });
}
