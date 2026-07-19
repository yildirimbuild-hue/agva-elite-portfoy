import { NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/audit-store";
import { confirmAppointment } from "@/lib/appointment-store";
import { recordError } from "@/lib/error-store";
import { createLead, deleteLead } from "@/lib/lead-store";
import { getListings } from "@/lib/listing-store";
import { isPublicRateLimited } from "@/lib/public-rate-limit";
import type { AppointmentSource } from "@/lib/types";

export const dynamic = "force-dynamic";

function clean(value: unknown, limit: number) { return typeof value === "string" ? value.trim().slice(0, limit) : ""; }

export async function POST(request: Request) {
  if (isPublicRateLimited(request, "appointment-create", 10, 60 * 60 * 1000)) return NextResponse.json({ error: "Çok fazla randevu talebi gönderildi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
  const requestId = crypto.randomUUID();
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const holdToken = clean(body?.holdToken, 80);
  const listingReference = clean(body?.listingReference, 16).toUpperCase();
  const customerName = clean(body?.customerName, 80);
  const phone = clean(body?.phone, 24).replace(/[^\d+]/g, "");
  const note = clean(body?.note, 500);
  const source: AppointmentSource = body?.source === "ai-chat" ? "ai-chat" : body?.source === "admin" ? "admin" : "listing-button";
  if (!holdToken || !listingReference || customerName.length < 2 || phone.replace(/\D/g, "").length < 10) {
    return NextResponse.json({ error: "Ad, geçerli telefon, ilan ve seçilen saat zorunludur." }, { status: 400 });
  }
  try {
    const listing = (await getListings()).find((item) => item.reference === listingReference);
    if (!listing) return NextResponse.json({ error: "İlan bulunamadı." }, { status: 404 });
    const lead = await createLead({
      kind: "randevu",
      name: customerName,
      phone,
      budget: "",
      region: listing.location,
      propertyType: listing.propertyType,
      appointmentTime: "Takvimden seçildi",
      summary: `${listing.reference} ilanı için yerinde inceleme randevusu`,
      listingReferences: [listing.reference],
    });
    let appointment;
    try {
      appointment = await confirmAppointment({
        holdToken,
        leadId: lead.id,
        listingReference: listing.reference,
        listingTitle: listing.title,
        customerName,
        phone,
        source,
        note,
      });
    } catch (error) {
      await deleteLead(lead.id).catch(() => false);
      throw error;
    }
    await appendAuditEvent({ actor: "public", action: "appointment.create", entityType: "appointment", entityId: appointment.id, details: { leadId: lead.id, listingReference: listing.reference, startAt: appointment.startAt, status: appointment.status, source }, requestId });
    return NextResponse.json({ appointment, leadId: lead.id }, { status: 201 });
  } catch (error) {
    console.error("Appointment create failed", error);
    await recordError("appointments.create", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Randevu kaydedilemedi." }, { status: 409 });
  }
}
