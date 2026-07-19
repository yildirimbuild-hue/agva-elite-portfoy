import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-store";
import { isAdminAuthenticated } from "@/lib/auth";
import { isLeadStage } from "@/lib/lead-pipeline";
import { deleteLead, getLeads, updateLeadProfile, updateLeadStage } from "@/lib/lead-store";
import { recordError } from "@/lib/error-store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  try { return NextResponse.json(await getLeads()); }
  catch (error) { await recordError("admin.leads.list", error); return NextResponse.json({ error: "Talepler okunamadı. Dağıtım ayarlarını kontrol edin." }, { status: 503 }); }
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null) as { id?: unknown; stage?: unknown; profile?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Müşteri belirtilmedi." }, { status: 400 });
  try {
    if (isLeadStage(body?.stage)) {
      const updated = await updateLeadStage(id, body.stage);
      if (!updated) return NextResponse.json({ error: "Müşteri bulunamadı." }, { status: 404 });
      await appendAuditEvent({ actor: "admin", action: "customer.stage", entityType: "lead", entityId: id, details: { stage: body.stage }, requestId });
      return NextResponse.json(updated);
    }
    if (body?.profile && typeof body.profile === "object") {
      const updated = await updateLeadProfile(id, body.profile);
      if (!updated) return NextResponse.json({ error: "Müşteri bulunamadı." }, { status: 404 });
      await appendAuditEvent({ actor: "admin", action: "customer.profile", entityType: "lead", entityId: id, details: { fields: Object.keys(body.profile as object).slice(0, 40) }, requestId });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "CRM durumu veya müşteri kartı değişikliği zorunludur." }, { status: 400 });
  } catch (error) {
    await recordError("admin.leads.update", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Müşteri kaydedilemedi." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Silinecek müşteri belirtilmedi." }, { status: 400 });
  try {
    const removed = await deleteLead(id);
    if (!removed) return NextResponse.json({ error: "Müşteri bulunamadı." }, { status: 404 });
    await appendAuditEvent({ actor: "admin", action: "customer.delete", entityType: "lead", entityId: id, details: {}, requestId });
    return NextResponse.json({ ok: true });
  } catch (error) { await recordError("admin.leads.delete", error); return NextResponse.json({ error: "Müşteri silinemedi. Dağıtım ayarlarını kontrol edin." }, { status: 503 }); }
}
