import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

function isSuperAdmin(session: any) {
  return session?.user && (session.user as any).role === "superadmin";
}

export async function GET() {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const companies = await prisma.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true, leads: true } } },
  });

  return NextResponse.json({
    companies: companies.map((c) => ({
      id: c.id,
      name: c.name,
      website: c.website,
      phone: c.phone,
      plan: (c as any).plan ?? "starter",
      active: (c as any).active ?? true,
      metaAdAccountId: (c as any).metaAdAccountId ?? null,
      hasOwnToken: !!((c as any).metaAccessToken),
      userCount: c._count.users,
      leadCount: c._count.leads,
      createdAt: c.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, website, phone, plan, metaAdAccountId, metaAccessToken, adminName, adminEmail, adminPassword } = body;

  if (!name || !adminName || !adminEmail || !adminPassword) {
    return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });

  const hashedPassword = await bcrypt.hash(adminPassword, 12);

  const company = await prisma.company.create({
    data: {
      name,
      website: website || null,
      phone: phone || null,
      plan: plan || "starter",
      active: true,
      metaAdAccountId: metaAdAccountId || null,
      metaAccessToken: metaAccessToken || null,
      users: {
        create: {
          name: adminName,
          email: adminEmail,
          password: hashedPassword,
          role: "admin",
        },
      },
    } as any,
    include: { users: { select: { id: true, email: true, name: true, role: true } } },
  });

  return NextResponse.json({ company }, { status: 201 });
}
