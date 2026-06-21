import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  const where = companyId ? { companyId } : userId ? { userId } : { id: "none" };

  const projections = await prisma.projection.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      mode: true,
      businessType: true,
      ticket: true,
      difficulty: true,
      productPrice: true,
      input: true,
      result: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ projections });
}
