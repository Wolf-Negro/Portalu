import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { moduleId, userId, score } = await req.json();
  if (!moduleId || !userId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const progress = await prisma.trainingProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    update: { completed: true, score, completedAt: new Date() },
    create: { userId, moduleId, completed: true, score, completedAt: new Date() },
  });
  return NextResponse.json(progress);
}
