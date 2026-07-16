import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const DEFAULT_ELEVENLABS_VOICE_ID = "KAGDtM2gzDrjWlUp2KNe";
export const DEFAULT_ELEVENLABS_MODEL = "eleven_flash_v2_5";

type SynthesisOptions = {
  apiKey: string;
  voiceId: string;
  model: string;
  stability: number;
  similarity: number;
  text: string;
};

export function speechText(value: string) {
  return value
    .replace(/\[([^\]]+)]\([^\s)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[*_#>`~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1200);
}

export async function synthesizeSpeech(options: SynthesisOptions) {
  const text = speechText(options.text);
  if (!text) throw new Error("Seslendirilecek metin boş.");
  if (!/^[a-z0-9_-]{8,64}$/i.test(options.voiceId)) throw new Error("ElevenLabs ses kimliği geçersiz.");

  const startedAt = Date.now();
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(options.voiceId)}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": options.apiKey },
      body: JSON.stringify({
        text,
        model_id: options.model,
        voice_settings: {
          stability: options.stability,
          similarity_boost: options.similarity,
          style: 0.25,
          use_speaker_boost: true,
          speed: 1,
        },
      }),
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const detail = await response.json().catch(() => null) as { detail?: { message?: string } | string } | null;
    const message = typeof detail?.detail === "string" ? detail.detail : detail?.detail?.message;
    throw new Error(message || `ElevenLabs bağlantı hatası (${response.status}).`);
  }

  return { audio: await response.arrayBuffer(), latencyMs: Date.now() - startedAt };
}

function signingSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "development-secret-must-be-replaced";
}

function messageDigest(text: string) {
  return createHash("sha256").update(speechText(text)).digest("base64url");
}

export function createVoiceToken(text: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", signingSecret()).update(`${timestamp}.${messageDigest(text)}`).digest("base64url");
  return `${timestamp}.${signature}`;
}

export function verifyVoiceToken(text: string, token: string) {
  const [timestamp, signature] = token.split(".");
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (age < -30 || age > 10 * 60) return false;
  const expected = createHmac("sha256", signingSecret()).update(`${timestamp}.${messageDigest(text)}`).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}
