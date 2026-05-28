import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isSuperAdmin(session: any) {
  return session?.user && (session.user as any).role === "superadmin";
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      users: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      _count: { select: { leads: true, opportunities: true } },
    },
  });

  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      website: company.website,
      phone: company.phone,
      plan: (company as any).plan ?? "starter",
      active: (company as any).active ?? true,
      metaAdAccountId: (company as any).metaAdAccountId ?? null,
      hasOwnToken: !!((company as any).metaAccessToken),
      users: company.users,
      leadCount: company._count.leads,
      opportunityCount: company._count.opportunities,
      createdAt: company.createdAt,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await req.json();

  const data: any = {};
  if (body.name !== undefined) data.name = body.name;
  if (body.website !== undefined) data.website = body.website || null;
  if (body.phone !== undefined) data.phone = body.phone || null;
  if (body.plan !== undefined) data.plan = body.plan;
  if (body.active !== undefined) data.active = body.active;
  if (body.metaAdAccountId !== undefined) data.metaAdAccountId = body.metaAdAccountId || null;
  if (body.metaAccessToken !== undefined) data.metaAccessToken = body.metaAccessToken || null;

  const company = await prisma.company.update({ where: { id }, data });
  return NextResponse.json({ success: true, company });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const { name, email, password, role } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role || "asesor", companyId: id },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}
