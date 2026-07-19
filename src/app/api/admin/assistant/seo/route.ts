import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createLocalListingCopy, normalizeListingCopy, parseDeepSeekJson, sanitizeCopyInput } from "@/lib/listing-copy";
import { getRuntimeSiteSettings } from "@/lib/site-settings-store";
import type { ListingCopyInput } from "@/lib/listing-copy";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as ListingCopyInput | null;
  let input: ReturnType<typeof sanitizeCopyInput>;
  try {
    input = sanitizeCopyInput(body ?? { points: [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Üç ilan maddesi zorunludur." }, { status: 400 });
  }

  const settings = await getRuntimeSiteSettings();
  if (!settings.aiEnabled || !settings.apiKey) {
    return NextResponse.json(createLocalListingCopy(input));
  }

  const systemPrompt = `Sen İKİSU Emlak için Türkçe ilan metni ve SEO çıktısı hazırlayan kıdemli bir emlak editörüsün.
Yalnız kullanıcının verdiği üç maddede bulunan gerçekleri kullan. Fiyat, mesafe, garanti, yatırım getirisi, tapu durumu veya teknik özellik uydurma.
Tek bir JSON nesnesi döndür. Alanlar: title, description, seoTitle, metaDescription, keywords, slug.
Kurallar:
- title: profesyonel ve doğal, en fazla 110 karakter.
- description: 3-5 kısa paragraf, ikna edici ama ölçüsüz iddia içermeyen, en fazla 2400 karakter.
- seoTitle: en fazla 60 karakter.
- metaDescription: en fazla 155 karakter.
- keywords: 5-8 kısa Türkçe anahtar kelime dizisi.
- slug: küçük harfli, ASCII, tireli URL metni.
Markdown veya açıklama yazma; yalnız geçerli JSON döndür.`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${settings.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.aiModel,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(input) },
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.35,
        max_tokens: 1700,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const payload = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } | null;
    if (!response.ok) {
      console.error("DeepSeek SEO writer error", response.status, payload?.error?.message);
      return NextResponse.json({ error: "DeepSeek ilan metnini şu anda üretemedi. Bağlantı ve model ayarını kontrol edin." }, { status: 502 });
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "DeepSeek boş yanıt döndürdü." }, { status: 502 });
    return NextResponse.json(normalizeListingCopy(parseDeepSeekJson(content), "deepseek"));
  } catch (error) {
    console.error("DeepSeek SEO writer failed", error);
    return NextResponse.json({ error: "DeepSeek ilan yazarı zaman aşımına uğradı." }, { status: 504 });
  }
}
