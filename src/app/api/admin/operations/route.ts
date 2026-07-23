import { NextResponse } from "next/server";
import { getAuditEvents } from "@/lib/audit-store";
import { isAdminAuthenticated } from "@/lib/auth";
import { getErrorEvents, recordError } from "@/lib/error-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  try {
    const [auditEvents, errorEvents] = await Promise.all([
      getAuditEvents(100),
      getErrorEvents(100),
    ]);
    return NextResponse.json({ auditEvents, errorEvents });
  } catch (error) {
    await recordError("admin.operations.list", error);
    return NextResponse.json({ error: "Sistem kayıtları okunamadı." }, { status: 503 });
  }
}
