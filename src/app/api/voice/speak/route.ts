import { NextResponse } from "next/server";
import { synthesizeSpeech, verifyVoiceToken } from "@/lib/elevenlabs";
import { getRuntimeSiteSettings } from "@/lib/site-settings-store";

export const dynamic = "force-dynamic";

const rateLimit = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(request: Request) {
  const client = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const current = rateLimit.get(client);
  if (!current || current.resetAt <= now) {
    rateLimit.set(client, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  current.count += 1;
  return current.count > 20;
}

export async function POST(request: Request) {
  if (isRateLimited(request)) return NextResponse.json({ error: "Ses kullanım sınırına ulaşıldı. Lütfen biraz sonra tekrar deneyin." }, { status: 429 });
  const body = await request.json().catch(() => null) as { text?: unknown; token?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text : "";
  const token = typeof body?.token === "string" ? body.token : "";
  if (!text || text.length > 1400 || !verifyVoiceToken(text, token)) {
    return NextResponse.json({ error: "Geçersiz veya süresi dolmuş ses isteği." }, { status: 403 });
  }

  const settings = await getRuntimeSiteSettings();
  if (!settings.voiceEnabled || !settings.elevenLabsApiKey) {
    return NextResponse.json({ error: "Sesli danışman henüz etkin değil." }, { status: 503 });
  }

  try {
    const result = await synthesizeSpeech({
      apiKey: settings.elevenLabsApiKey,
      voiceId: settings.elevenLabsVoiceId,
      model: settings.elevenLabsModel,
      stability: settings.voiceStability,
      similarity: settings.voiceSimilarity,
      text,
    });
    return new Response(result.audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Voice-Latency": String(result.latencyMs),
      },
    });
  } catch (error) {
    console.error("ElevenLabs speech request failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Doğal ses hizmetine şu anda ulaşılamıyor." }, { status: 502 });
  }
}
