import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-store";
import { isAdminAuthenticated } from "@/lib/auth";
import { createInteraction, deleteInteraction, getInteractions, sanitizeInteractionInput } from "@/lib/interaction-store";
import { updateLeadProfile } from "@/lib/lead-store";
import { recordError } from "@/lib/error-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const leadId = new URL(request.url).searchParams.get("leadId") ?? undefined;
  try { return NextResponse.json(await getInteractions(leadId)); }
  catch (error) { await recordError("admin.interactions.list", error); return NextResponse.json({ error: "İletişim geçmişi okunamadı." }, { status: 503 }); }
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null);
  const input = sanitizeInteractionInput(body);
  if (!input.leadId || !input.summary) return NextResponse.json({ error: "Müşteri ve görüşme özeti zorunludur." }, { status: 400 });
  try {
    const interaction = await createInteraction(input);
    const profile = await updateLeadProfile(input.leadId, { lastContactAt: interaction.createdAt, ...(input.nextActionAt ? { nextActionAt: input.nextActionAt } : {}) });
    if (!profile) {
      await deleteInteraction(interaction.id).catch(() => false);
      return NextResponse.json({ error: "Müşteri bulunamadı." }, { status: 404 });
    }
    await appendAuditEvent({ actor: "admin", action: "customer.interaction.create", entityType: "lead", entityId: input.leadId, details: { interactionId: interaction.id, type: interaction.type, nextActionAt: interaction.nextActionAt }, requestId });
    return NextResponse.json({ interaction, lead: profile }, { status: 201 });
  } catch (error) { await recordError("admin.interactions.create", error); return NextResponse.json({ error: error instanceof Error ? error.message : "İletişim kaydedilemedi." }, { status: 503 }); }
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const body = await request.json().catch(() => null) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Silinecek kayıt belirtilmedi." }, { status: 400 });
  try {
    const removed = await deleteInteraction(id);
    if (!removed) return NextResponse.json({ error: "İletişim kaydı bulunamadı." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) { await recordError("admin.interactions.delete", error); return NextResponse.json({ error: "İletişim kaydı silinemedi." }, { status: 503 }); }
}
