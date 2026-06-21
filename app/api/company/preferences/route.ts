import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  let prefs: Record<string, unknown> = {};
  try {
    if (user?.preferences) prefs = JSON.parse(user.preferences);
  } catch {}
  return NextResponse.json({
    notifications: (prefs.notifications as boolean[] | undefined) ?? [true, true, false, false],
    items: prefs.items,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } });
  let prefs: Record<string, unknown> = {};
  try {
    if (existing?.preferences) prefs = JSON.parse(existing.preferences);
  } catch {}

  if (body.notifications !== undefined) prefs.notifications = body.notifications;
  if (body.widgets !== undefined) prefs.widgets = body.widgets;
  if (body.dashboardConfigured !== undefined) prefs.dashboardConfigured = body.dashboardConfigured;
  if (body.goal !== undefined) prefs.goal = body.goal;
  if (body.layout !== undefined) prefs.layout = body.layout;
  if (body.items !== undefined) prefs.items = body.items;

  await prisma.user.update({ where: { id: userId }, data: { preferences: JSON.stringify(prefs) } });
  return NextResponse.json({ ok: true });
}
