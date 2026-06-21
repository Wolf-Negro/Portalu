import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const body = await req.json();

  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingDone: true,
      preferences: JSON.stringify(body),
    } as any,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id as string;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { onboardingDone: true, preferences: true } as any,
  });

  return NextResponse.json({
    onboardingDone: (user as any)?.onboardingDone ?? false,
    preferences: (user as any)?.preferences ? JSON.parse((user as any).preferences) : null,
  });
}
