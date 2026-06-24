import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

function isSuperAdmin(session: any) {
  return session?.user && (session.user as any).role === "superadmin";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const accounts = await prisma.metaAdAccount.findMany({
    where: { companyId: id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();
  const accountId = (body.accountId as string | undefined)?.trim();
  const label = (body.label as string | undefined)?.trim() || null;
  const accessToken = (body.accessToken as string | undefined)?.trim() || null;

  if (!accountId) {
    return NextResponse.json({ error: "El ID de la cuenta publicitaria es obligatorio" }, { status: 400 });
  }

  const account = await prisma.metaAdAccount.create({
    data: { companyId: id, accountId, label, accessToken },
  });

  return NextResponse.json({ account }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await params; // companyId no se necesita para el delete por id, pero valida la ruta
  const body = await req.json().catch(() => ({}));
  const accountRowId = body.accountRowId as string | undefined;
  if (!accountRowId) return NextResponse.json({ error: "Falta accountRowId" }, { status: 400 });

  await prisma.metaAdAccount.delete({ where: { id: accountRowId } });
  return NextResponse.json({ success: true });
}
