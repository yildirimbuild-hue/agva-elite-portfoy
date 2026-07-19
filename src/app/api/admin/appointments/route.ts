import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-store";
import { deleteAppointment, getAppointments, updateAppointmentStatus } from "@/lib/appointment-store";
import { isAdminAuthenticated } from "@/lib/auth";
import { recordError } from "@/lib/error-store";
import type { AppointmentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";
const statuses: AppointmentStatus[] = ["Talep Alındı", "Onaylandı", "İptal Edildi", "Tamamlandı", "Gelmedi"];

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  try { return NextResponse.json(await getAppointments()); }
  catch (error) { await recordError("admin.appointments.list", error); return NextResponse.json({ error: "Randevular okunamadı." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null) as { id?: unknown; status?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  const status = statuses.includes(body?.status as AppointmentStatus) ? body?.status as AppointmentStatus : null;
  if (!id || !status) return NextResponse.json({ error: "Randevu ve geçerli durum zorunludur." }, { status: 400 });
  try {
    const appointment = await updateAppointmentStatus(id, status);
    if (!appointment) return NextResponse.json({ error: "Randevu bulunamadı." }, { status: 404 });
    await appendAuditEvent({ actor: "admin", action: "appointment.status", entityType: "appointment", entityId: id, details: { status }, requestId });
    return NextResponse.json(appointment);
  } catch (error) { await recordError("admin.appointments.update", error); return NextResponse.json({ error: "Randevu güncellenemedi." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Randevu belirtilmedi." }, { status: 400 });
  try {
    const removed = await deleteAppointment(id);
    if (!removed) return NextResponse.json({ error: "Randevu bulunamadı." }, { status: 404 });
    await appendAuditEvent({ actor: "admin", action: "appointment.delete", entityType: "appointment", entityId: id, details: {}, requestId });
    return NextResponse.json({ ok: true });
  } catch (error) { await recordError("admin.appointments.delete", error); return NextResponse.json({ error: "Randevu silinemedi." }, { status: 503 }); }
}
