import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-store";
import { holdAppointmentSlot } from "@/lib/appointment-store";
import { recordError } from "@/lib/error-store";
import { getListings } from "@/lib/listing-store";
import { isPublicRateLimited } from "@/lib/public-rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (isPublicRateLimited(request, "appointment-hold", 30, 10 * 60 * 1000)) return NextResponse.json({ error: "Çok fazla saat seçimi yapıldı. Lütfen kısa süre sonra tekrar deneyin." }, { status: 429 });
  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null) as { listingReference?: unknown; startAt?: unknown } | null;
  const listingReference = typeof body?.listingReference === "string" ? body.listingReference.toUpperCase().slice(0, 16) : "";
  const startAt = typeof body?.startAt === "string" ? body.startAt : "";
  if (!listingReference || !startAt) return NextResponse.json({ error: "İlan ve randevu saati zorunludur." }, { status: 400 });
  try {
    const listing = (await getListings()).find((item) => item.reference === listingReference);
    if (!listing) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
    const hold = await holdAppointmentSlot(listingReference, startAt);
    await appendAuditEvent({ actor: "public", action: "appointment.hold", entityType: "appointment-slot", entityId: hold.token, details: { listingReference, startAt: hold.startAt, expiresAt: hold.expiresAt }, requestId });
    return NextResponse.json(hold);
  } catch (error) {
    await recordError("appointments.hold", error, "warning");
    return NextResponse.json({ error: error instanceof Error ? error.message : "Saat tutulamadı." }, { status: 409 });
  }
}
