import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.phone !== undefined ? { phone: body.phone } : {}),
      ...(body.email !== undefined ? { email: body.email } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.origin !== undefined ? { origin: body.origin } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.asesorId !== undefined ? { asesorId: body.asesorId } : {}),
    },
    include: { asesor: { select: { id: true, name: true } } },
  });

  if (body.status) {
    await prisma.activity.create({
      data: {
        type: "nota",
        description: `Estado actualizado a: ${body.status}`,
        userId: (session.user as any).id,
        leadId: lead.id,
      },
    });
  }

  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
