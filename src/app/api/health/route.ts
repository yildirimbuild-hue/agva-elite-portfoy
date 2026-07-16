import { NextResponse } from "next/server";
import { getDeploymentChecks } from "@/lib/deployment";
import { getListingStorageMode, getListings } from "@/lib/listing-store";
import { getRuntimeSiteSettings } from "@/lib/site-settings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks = getDeploymentChecks();
  let catalogReadable = false;
  let settingsReadable = false;
  let publishedListings = 0;
  let runtimeServices: Record<string, boolean> = {};

  try {
    const [listings, settings] = await Promise.all([getListings(), getRuntimeSiteSettings()]);
    catalogReadable = true;
    settingsReadable = true;
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
  const ready = catalogReadable && settingsReadable && requiredReady;

  return NextResponse.json(
    {
      status: ready ? "ready" : "configuration_required",
      environment: process.env.VERCEL_ENV ?? "local",
      catalog: { readable: catalogReadable, publishedListings, storage: getListingStorageMode() },
      settings: { readable: settingsReadable },
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
