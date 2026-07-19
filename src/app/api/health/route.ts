import { NextResponse } from "next/server";
import { getAppointmentSettings } from "@/lib/appointment-store";
import { getDeploymentChecks } from "@/lib/deployment";
import { getListingStorageMode, getListings } from "@/lib/listing-store";
import { getRuntimeSiteSettings } from "@/lib/site-settings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = getDeploymentChecks();
  let catalogReadable = false;
  let settingsReadable = false;
  let appointmentCalendarReadable = false;
  let publishedListings = 0;
  let runtimeServices: Record<string, boolean> = {};

  try {
    const [listings, settings, appointmentSettings] = await Promise.all([getListings(), getRuntimeSiteSettings(), getAppointmentSettings()]);
    catalogReadable = true;
    settingsReadable = true;
    appointmentCalendarReadable = Boolean(appointmentSettings.timezone);
    publishedListings = listings.length;
    runtimeServices = {
      deepseek: settings.aiEnabled && Boolean(settings.apiKey),
      elevenlabs: settings.voiceEnabled && Boolean(settings.elevenLabsApiKey),
      whatsapp: settings.whatsappNumber.length >= 10,
      phone: settings.phoneNumber.length >= 10,
    };
  } catch (error) {
    console.error("Health check data read failed", error);
  }

  const requiredReady = checks.filter((check) => check.required).every((check) => check.configured);
  const ready = catalogReadable && settingsReadable && appointmentCalendarReadable && requiredReady;

  return NextResponse.json(
    {
      status: ready ? "ready" : "configuration_required",
      environment: process.env.VERCEL_ENV ?? "local",
      catalog: { readable: catalogReadable, publishedListings, storage: getListingStorageMode() },
      settings: { readable: settingsReadable },
      appointments: { readable: appointmentCalendarReadable },
      services: {
        ...Object.fromEntries(checks.map((check) => [check.key, check.configured])),
        ...runtimeServices,
      },
    },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
