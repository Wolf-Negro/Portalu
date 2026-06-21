import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, LEGACY_COMPANY_ID } from "@/lib/bot-db";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    const [row] = await sql`SELECT state FROM connection_state WHERE company_id = ${companyId}`;
    const state = (row as any)?.state || "disconnected";

    let qrCodeDataUrl = null;
    if (state.startsWith("qr:")) {
      qrCodeDataUrl = await QRCode.toDataURL(state.substring(3));
    }

    return NextResponse.json({
      status: state.startsWith("qr:") ? "qr" : state.split(":")[0],
      qr:     qrCodeDataUrl,
      number: state.includes("connected:") ? state.split(":")[1] : null,
    });
  } catch (error) {
    console.error("API Status Error:", error);
    return NextResponse.json({ status: "disconnected", qr: null, number: null });
  }
}
