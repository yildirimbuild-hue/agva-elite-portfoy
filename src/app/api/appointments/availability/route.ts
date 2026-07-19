import { NextResponse } from "next/server";
import { getAvailability } from "@/lib/appointment-store";
import { recordError } from "@/lib/error-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const availability = await getAvailability();
    return NextResponse.json(availability, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Appointment availability failed", error);
    await recordError("appointments.availability", error);
    return NextResponse.json({ error: "Randevu takvimi şu anda yüklenemiyor." }, { status: 503 });
  }
}
