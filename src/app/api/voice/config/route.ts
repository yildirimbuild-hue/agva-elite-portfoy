import { NextResponse } from "next/server";
import { getRuntimeSiteSettings } from "@/lib/site-settings-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getRuntimeSiteSettings();
  return NextResponse.json({
    enabled: settings.voiceEnabled,
    ready: settings.voiceEnabled && Boolean(settings.elevenLabsApiKey),
    voiceName: "Deniz",
  }, { headers: { "Cache-Control": "no-store" } });
}
