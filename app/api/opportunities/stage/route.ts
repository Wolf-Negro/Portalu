import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId;

  const { id, stage } = await req.json();
  if (!id || !stage) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const existing = await prisma.opportunity.findUnique({ where: { id }, select: { companyId: true } });
  if (!existing || existing.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const opp = await prisma.opportunity.update({ where: { id }, data: { stage } });
  return NextResponse.json(opp);
}
