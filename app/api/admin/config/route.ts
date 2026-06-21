import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

const ALLOWED_KEYS = ["OPENAI_API_KEY", "META_ACCESS_TOKEN", "META_AD_ACCOUNT_ID_DEFAULT"];

function isSuperAdmin(session: any) {
  return session?.user && (session.user as any).role === "superadmin";
}

export async function GET() {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: ALLOWED_KEYS } },
  });

  const result: Record<string, string> = {};
  for (const c of configs) {
    result[c.key] = c.value;
  }

  return NextResponse.json({ config: result });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();

  const updates = Object.entries(body).filter(([key]) => ALLOWED_KEYS.includes(key));

  await Promise.all(
    updates.map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
