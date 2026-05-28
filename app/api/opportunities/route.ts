import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const body = await req.json();
  const opp = await prisma.opportunity.create({
    data: {
      title: body.title,
      value: body.value || 0,
      stage: body.stage || "nuevo_lead",
      probability: body.probability || 20,
      notes: body.notes || null,
      leadId: body.leadId || null,
      companyId,
    },
    include: { lead: { select: { name: true, phone: true, email: true, origin: true } } },
  });
  return NextResponse.json(opp, { status: 201 });
}
