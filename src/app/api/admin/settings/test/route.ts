import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getRuntimeSiteSettings } from "@/lib/site-settings-store";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { apiKey?: unknown; aiModel?: unknown } | null;
  const settings = await getRuntimeSiteSettings();
  const apiKey = typeof body?.apiKey === "string" && body.apiKey.trim() ? body.apiKey.trim() : settings.apiKey;
  const aiModel = typeof body?.aiModel === "string" && body.aiModel.trim() ? body.aiModel.trim() : settings.aiModel;
  if (!apiKey) return NextResponse.json({ error: "Test edilecek DeepSeek API anahtarı bulunamadı." }, { status: 400 });
  const startedAt = Date.now();
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: aiModel, messages: [{ role: "user", content: "Yalnız TAMAM yaz." }], thinking: { type: "disabled" }, max_tokens: 8, stream: false }),
      signal: AbortSignal.timeout(20000),
    });
    const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    if (!response.ok) return NextResponse.json({ error: payload?.error?.message ?? `DeepSeek ${response.status} hatası.` }, { status: 400 });
    return NextResponse.json({ ok: true, model: aiModel, latencyMs: Date.now() - startedAt });
  } catch {
    return NextResponse.json({ error: "DeepSeek bağlantı testi zaman aşımına uğradı." }, { status: 504 });
  }
}
