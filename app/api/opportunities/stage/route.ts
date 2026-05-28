import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const { id, stage } = await req.json();
  if (!id || !stage) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const opp = await prisma.opportunity.update({ where: { id }, data: { stage } });
  return NextResponse.json(opp);
}
