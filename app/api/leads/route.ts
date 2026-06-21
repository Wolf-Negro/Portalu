import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const origin = searchParams.get("origin");
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get("pageSize")) || 100));

  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(origin ? { origin } : {}),
  };

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: { asesor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  return NextResponse.json({ leads, total, page, pageSize });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const lead = await prisma.lead.create({
    data: {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      origin: body.origin || "otros",
      status: body.status || "nuevo",
      notes: body.notes || null,
      asesorId: body.asesorId || null,
      companyId,
    },
    include: { asesor: { select: { id: true, name: true } } },
  });

  await prisma.activity.create({
    data: {
      type: "nota",
      description: `Nuevo lead creado: ${lead.name}`,
      userId: (session.user as any).id,
      leadId: lead.id,
    },
  });

  return NextResponse.json(lead, { status: 201 });
}
