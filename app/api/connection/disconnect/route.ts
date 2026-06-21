import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sql, LEGACY_COMPANY_ID } from "@/lib/bot-db";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session?.user || !["admin", "supervisor", "superadmin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId = (session.user as any).companyId || LEGACY_COMPANY_ID;

  try {
    await sql`
      INSERT INTO connection_state (state, company_id) VALUES ('disconnected', ${companyId})
      ON CONFLICT (company_id) DO UPDATE SET state = 'disconnected', last_update = CURRENT_TIMESTAMP
    `;

    const dataDir = path.resolve(process.cwd(), "data");
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(path.join(dataDir, `.restart-${companyId}`), "");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("API Disconnect Error:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }
}
