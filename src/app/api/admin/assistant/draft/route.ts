import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import type { ListingInput, ListingPurpose, PropertyType } from "@/lib/types";

export const dynamic = "force-dynamic";

type ListingDraft = Partial<ListingInput>;

const purposes: ListingPurpose[] = ["Satılık", "Kiralık"];
const propertyTypes: PropertyType[] = ["Villa", "Müstakil Ev", "Daire", "Arsa", "Ticari"];
const currencies: ListingInput["currency"][] = ["TRY", "USD", "EUR"];

const optionalDefaults: ListingDraft = {
  district: "Şile / İstanbul",
  oldPrice: 0,
  currency: "TRY",
  rooms: "",
  bathrooms: 0,
  grossArea: 0,
  netArea: 0,
  landArea: 0,
  floor: "",
  description: "",
  features: [],
  images: [],
  featured: false,
  urgent: false,
  published: false,
  isDemo: false,
};

function text(value: unknown, maxLength = 1200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : undefined;
}

function number(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function boolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function stringList(value: unknown, maxItems: number, maxLength: number) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, maxLength)).filter(Boolean).slice(0, maxItems);
}

function sanitize(value: unknown): ListingDraft {
  if (!value || typeof value !== "object") return {};
  const source = value as Record<string, unknown>;
  const purpose = purposes.includes(source.purpose as ListingPurpose) ? source.purpose as ListingPurpose : undefined;
  const propertyType = propertyTypes.includes(source.propertyType as PropertyType) ? source.propertyType as PropertyType : undefined;
  const currency = currencies.includes(source.currency as ListingInput["currency"]) ? source.currency as ListingInput["currency"] : undefined;
  return Object.fromEntries(Object.entries({
    title: text(source.title, 160), purpose, propertyType,
    location: text(source.location, 100), district: text(source.district, 100),
    price: number(source.price), oldPrice: number(source.oldPrice), currency,
    rooms: text(source.rooms, 30), bathrooms: number(source.bathrooms),
    grossArea: number(source.grossArea), netArea: number(source.netArea), landArea: number(source.landArea),
    floor: text(source.floor, 50), description: text(source.description, 2400),
    features: stringList(source.features, 30, 100), images: stringList(source.images, 15, 500),
    featured: boolean(source.featured), urgent: boolean(source.urgent),
  }).filter(([, item]) => item !== undefined));
}

function missingFields(draft: ListingDraft) {
  const missing: string[] = [];
  if (!draft.title) missing.push("ilan başlığı");
  if (!draft.purpose) missing.push("satılık veya kiralık bilgisi");
  if (!draft.propertyType) missing.push("emlak tipi");
  if (!draft.location) missing.push("bölge");
  if (!draft.price || draft.price <= 0) missing.push("fiyat");
  return missing;
}

function parseJson(content: string) {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as unknown;
}

export async function POST(request: Request) {
  if (!(await isAdminAuthenticated())) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { instruction?: unknown; draft?: unknown } | null;
  const instruction = text(body?.instruction, 3000);
  if (!instruction) return NextResponse.json({ error: "İlan bilgisi gönderin." }, { status: 400 });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "DeepSeek API anahtarı yapılandırılmadı." }, { status: 503 });

  const currentDraft = { ...optionalDefaults, ...sanitize(body?.draft) };
  const systemPrompt = `Türkçe emlak ilanı metnini yalnızca JSON nesnesine dönüştüren bir veri yardımcısısın.
Geçerli alanlar: title, purpose, propertyType, location, district, price, oldPrice, currency, rooms, bathrooms, grossArea, netArea, landArea, floor, description, features, images, featured, urgent.
purpose yalnız "Satılık" veya "Kiralık"; propertyType yalnız "Villa", "Müstakil Ev", "Daire", "Arsa", "Ticari"; currency yalnız "TRY", "USD", "EUR" olabilir.
"milyon" ve "bin" ifadelerini tam sayıya çevir. Kullanıcının vermediği önemli bilgileri uydurma; mevcut taslaktaki bilgileri koru. Son talimat mevcut taslaktaki bir alanı düzeltiyorsa düzelt.
Yalnız tek bir geçerli JSON nesnesi döndür; açıklama veya markdown yazma.`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ currentDraft, instruction }) },
        ],
        response_format: { type: "json_object" },
        thinking: { type: "disabled" },
        temperature: 0.1,
        max_tokens: 1400,
        stream: false,
      }),
      signal: AbortSignal.timeout(30000),
    });
    const payload = await response.json().catch(() => null) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    } | null;
    if (!response.ok) {
      console.error("DeepSeek admin draft error", response.status, payload?.error?.message);
      return NextResponse.json({ error: "İlan taslağı şu anda hazırlanamadı." }, { status: 502 });
    }
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) return NextResponse.json({ error: "İlan taslağı boş döndü." }, { status: 502 });

    const draft: ListingDraft = {
      ...currentDraft,
      ...sanitize(parseJson(content)),
      published: false,
      isDemo: false,
    };
    if ((draft.oldPrice ?? 0) > 0 && (draft.oldPrice ?? 0) <= (draft.price ?? 0)) draft.oldPrice = 0;
    const missing = missingFields(draft);
    return NextResponse.json({
      draft,
      missing,
      answer: missing.length
        ? `Taslağı hazırlıyorum. Şu bilgileri de yazar mısınız: ${missing.join(", ")}?`
        : "İlan taslağını hazırladım. Bilgileri kontrol edip taslak olarak kaydedebilir veya hemen yayınlayabilirsiniz.",
    });
  } catch (error) {
    console.error("DeepSeek admin draft failed", error);
    return NextResponse.json({ error: "İlan taslağı hazırlanırken bağlantı zaman aşımına uğradı." }, { status: 504 });
  }
}
