import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { conversationId, content } = await req.json();
  if (!conversationId || !content?.trim()) {
    return NextResponse.json(
      { error: "conversationId y content requeridos" },
      { status: 400 }
    );
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      content: content.trim(),
      direction: "outbound",
    },
  });

  return NextResponse.json({ message });
}
