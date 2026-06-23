import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchAccountMetricsRange } from "@/lib/meta-insights";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const since = searchParams.get("since");
  const until = searchParams.get("until");
  if (!since || !until) {
    return NextResponse.json({ error: "Faltan parámetros since/until" }, { status: 400 });
  }

  const companyId = (session.user as any).companyId as string | undefined;
  const result = await fetchAccountMetricsRange(companyId, since, until);

  return NextResponse.json(result);
}
