import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-store";
import { getAppointmentSettings, saveAppointmentSettings } from "@/lib/appointment-store";
import { isAdminAuthenticated } from "@/lib/auth";
import { recordError } from "@/lib/error-store";
import type { AppointmentSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  try { return NextResponse.json(await getAppointmentSettings()); }
  catch (error) { await recordError("admin.appointment-settings.list", error); return NextResponse.json({ error: "Takvim ayarları okunamadı." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null) as Partial<AppointmentSettings> | null;
  if (!body) return NextResponse.json({ error: "Geçerli ayar gönderin." }, { status: 400 });
  try {
    const settings = await saveAppointmentSettings(body);
    await appendAuditEvent({ actor: "admin", action: "appointment.settings", entityType: "appointment-settings", entityId: "default", details: { ...settings, blockedDates: settings.blockedDates.length }, requestId });
    return NextResponse.json(settings);
  } catch (error) { await recordError("admin.appointment-settings.update", error); return NextResponse.json({ error: error instanceof Error ? error.message : "Takvim ayarları kaydedilemedi." }, { status: 400 }); }
}
