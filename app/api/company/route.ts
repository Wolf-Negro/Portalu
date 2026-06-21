import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  const companyId = (session?.user as any)?.companyId as string | undefined;
  if (!companyId) return NextResponse.json({ error: "No company" }, { status: 400 });

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  return NextResponse.json(company);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  const role      = (session?.user as any)?.role as string;
  const companyId = (session?.user as any)?.companyId as string | undefined;
  if (!companyId || !["admin", "supervisor"].includes(role))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { name, website, phone, address } = await req.json();
  const company = await prisma.company.update({
    where: { id: companyId },
    data: {
      name:    name?.trim()    || undefined,
      website: website?.trim() || null,
      phone:   phone?.trim()   || null,
      address: address?.trim() || null,
    } as any,
  });
  return NextResponse.json({ success: true, company });
}
