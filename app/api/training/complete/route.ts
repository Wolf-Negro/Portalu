import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = (session.user as any).id;

  const { moduleId, score } = await req.json();
  if (!moduleId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  const progress = await prisma.trainingProgress.upsert({
    where: { userId_moduleId: { userId, moduleId } },
    update: { completed: true, score, completedAt: new Date() },
    create: { userId, moduleId, completed: true, score, completedAt: new Date() },
  });
  return NextResponse.json(progress);
}
