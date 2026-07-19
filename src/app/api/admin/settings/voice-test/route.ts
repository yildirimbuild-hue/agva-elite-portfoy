import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { synthesizeSpeech } from "@/lib/elevenlabs";
import { getRuntimeSiteSettings } from "@/lib/site-settings-store";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const body = await request.json().catch(() => null) as {
    apiKey?: unknown;
    voiceId?: unknown;
    model?: unknown;
    stability?: unknown;
    similarity?: unknown;
  } | null;
  const settings = await getRuntimeSiteSettings();
  const apiKey = typeof body?.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : settings.elevenLabsApiKey;
  if (!apiKey) return NextResponse.json({ error: "Önce ElevenLabs API anahtarını girin." }, { status: 400 });

  try {
    const result = await synthesizeSpeech({
      apiKey,
      voiceId: typeof body?.voiceId === "string" ? body.voiceId : settings.elevenLabsVoiceId,
      model: typeof body?.model === "string" ? body.model : settings.elevenLabsModel,
      stability: typeof body?.stability === "number" ? body.stability : settings.voiceStability,
      similarity: typeof body?.similarity === "number" ? body.similarity : settings.voiceSimilarity,
      text: "Merhaba, ben İKİSU Emlak'ın dijital portföy danışmanıyım. Size en uygun ilanı birlikte bulabiliriz.",
    });
    return new Response(result.audio, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store", "X-Voice-Latency": String(result.latencyMs) },
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ses bağlantısı test edilemedi." }, { status: 400 });
  }
}
