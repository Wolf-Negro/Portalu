import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sql as botSql } from "@/lib/bot-db";

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
      logo: (company as any).logo ?? null,
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  const company = await prisma.company.findUnique({ where: { id }, select: { id: true, name: true } });
  if (!company) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Confirmación explícita: el cliente debe escribir el nombre exacto de la
  // empresa antes de poder borrarla — evita un borrado accidental de un
  // clic perdido, dado que esta acción es irreversible.
  const body = await req.json().catch(() => ({}));
  if (body.confirmName !== company.name) {
    return NextResponse.json(
      { error: "El nombre de confirmación no coincide con el de la empresa." },
      { status: 400 }
    );
  }

  // Si el bot de WhatsApp de esta empresa está conectado, no se permite
  // borrar — el admin debe desconectarlo primero desde la página WhatsApp
  // (evita dejar una sesión de Baileys huérfana corriendo en el proceso bot).
  const [connState] = await botSql`
    SELECT state FROM connection_state WHERE company_id = ${id}
  `.catch(() => [] as any[]);
  if (connState?.state?.startsWith("connected:")) {
    return NextResponse.json(
      { error: "Esta empresa tiene WhatsApp conectado. Desconéctalo primero desde la página de WhatsApp antes de borrar la empresa." },
      { status: 409 }
    );
  }

  const users = await prisma.user.findMany({ where: { companyId: id }, select: { id: true } });
  const userIds = users.map((u) => u.id);
  const leads = await prisma.lead.findMany({ where: { companyId: id }, select: { id: true } });
  const leadIds = leads.map((l) => l.id);
  const opportunities = await prisma.opportunity.findMany({ where: { companyId: id }, select: { id: true } });
  const opportunityIds = opportunities.map((o) => o.id);

  // Orden de borrado: de las tablas que referencian a otras, hacia las que
  // son referenciadas — sin esto, las foreign keys bloquean el DELETE.
  // (Account/Session se borran solos por onDelete:Cascade desde User).
  await prisma.$transaction([
    prisma.activity.deleteMany({
      where: {
        OR: [
          { leadId: { in: leadIds } },
          { opportunityId: { in: opportunityIds } },
          { userId: { in: userIds } },
        ],
      },
    }),
    prisma.aluMessage.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.trainingProgress.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.opportunity.deleteMany({ where: { companyId: id } }),
    prisma.lead.deleteMany({ where: { companyId: id } }),
    prisma.campaign.deleteMany({ where: { companyId: id } }),
    prisma.alert.deleteMany({ where: { companyId: id } }),
    prisma.weeklySummary.deleteMany({ where: { companyId: id } }),
    prisma.projection.deleteMany({ where: { companyId: id } }),
    prisma.user.deleteMany({ where: { companyId: id } }),
    prisma.company.delete({ where: { id } }),
  ]);

  // Limpieza de las tablas del bot (raw SQL, fuera del esquema de Prisma) —
  // no son críticas si fallan (no hay FKs que las bloqueen), así que se
  // hacen best-effort después de confirmar el borrado del CRM.
  try {
    for (const table of ["messages", "conversations", "outbox", "events", "media_outbox", "contact_jids", "connection_state", "ai_settings", "meta_settings", "configuracion_meta", "app_config"]) {
      await botSql.unsafe(`DELETE FROM ${table} WHERE company_id = $1`, [id]);
    }
  } catch (err) {
    console.error("[admin/companies DELETE] No se pudo limpiar datos del bot:", err);
  }

  return NextResponse.json({ success: true });
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
