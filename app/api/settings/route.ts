import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAISettings, updateAISettings, LEGACY_COMPANY_ID } from "@/lib/bot-db";

export const dynamic = "force-dynamic";

function canManageConfig(session: any) {
  const role = session?.user?.role;
  return !!session?.user && ["admin", "supervisor", "superadmin"].includes(role);
}

function resolveCompanyId(session: any): string {
  return (session?.user as any)?.companyId || LEGACY_COMPANY_ID;
}

export async function GET() {
  const session = await auth();
  if (!canManageConfig(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = resolveCompanyId(session);

  try {
    const settings = await getAISettings(companyId);
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!canManageConfig(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = resolveCompanyId(session);

  try {
    const data = await req.json();
    await updateAISettings(companyId, {
      business_context: data.business_context || "",
      promotions:       data.promotions       || "",
      handoff_rules:    data.handoff_rules     || "",
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
