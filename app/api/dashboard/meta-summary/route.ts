import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { fetchAccountMetrics } from "@/lib/meta-insights";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const companyId = (session.user as any).companyId as string | undefined;
  const accountId = new URL(req.url).searchParams.get("account_id") || undefined;

  const [metaTodayResult, metaMonthlyResult, metaYesterdayResult] = await Promise.all([
    fetchAccountMetrics(companyId, "today", accountId),
    fetchAccountMetrics(companyId, "last_30d", accountId),
    fetchAccountMetrics(companyId, "yesterday", accountId),
  ]);

  const toMetaData = (r: Record<string, unknown>) => (r.error || r.message ? null : r);

  return NextResponse.json({
    metaToday: toMetaData(metaTodayResult),
    metaMonthly: toMetaData(metaMonthlyResult),
    metaYesterday: toMetaData(metaYesterdayResult),
    metaError: [metaTodayResult, metaMonthlyResult, metaYesterdayResult].some((r) => !!r.error),
  });
}
