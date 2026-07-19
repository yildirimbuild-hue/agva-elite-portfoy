import type { ListingCopyResult } from "./types";

export type ListingCopyInput = {
  points: string[];
  purpose?: string;
  propertyType?: string;
  location?: string;
};

export function slugifyCopy(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function cleanParagraph(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, maxLength) : "";
}

function cleanKeywords(value: unknown) {
  const source = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(source.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 45)).filter(Boolean))].slice(0, 8);
}

export function sanitizeCopyInput(input: ListingCopyInput) {
  const points = Array.isArray(input.points) ? input.points.map((item) => cleanText(item, 500)).filter(Boolean).slice(0, 3) : [];
  if (points.length !== 3) throw new Error("Tam olarak üç ilan maddesi girilmelidir.");
  return {
    points,
    purpose: cleanText(input.purpose, 30),
    propertyType: cleanText(input.propertyType, 40),
    location: cleanText(input.location, 80),
  };
}

export function normalizeListingCopy(value: unknown, source: ListingCopyResult["source"]): ListingCopyResult {
  const item = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const title = cleanText(item.title, 110);
  const description = cleanParagraph(item.description, 2400);
  const seoTitle = cleanText(item.seoTitle, 60) || title.slice(0, 60);
  const metaDescription = cleanText(item.metaDescription, 155) || description.replace(/\n/g, " ").slice(0, 155);
  const keywords = cleanKeywords(item.keywords);
  const slug = slugifyCopy(cleanText(item.slug, 100) || seoTitle || title);
  if (!title || !description || !seoTitle || !metaDescription || !slug) throw new Error("Üretilen ilan metni eksik alan içeriyor.");
  return { title, description, seoTitle, metaDescription, keywords, slug, source };
}

export function createLocalListingCopy(rawInput: ListingCopyInput): ListingCopyResult {
  const input = sanitizeCopyInput(rawInput);
  const context = [input.location, input.propertyType, input.purpose].filter(Boolean).join(" ");
  const title = cleanText(`${context ? `${context}: ` : ""}${input.points[0]}`, 110);
  const description = [
    input.points[0],
    input.points[1],
    input.points[2],
    "Detaylı bilgi ve yerinde inceleme için İKİSU Emlak ile iletişime geçebilirsiniz.",
  ].map((paragraph) => paragraph.endsWith(".") ? paragraph : `${paragraph}.`).join("\n\n");
  const seoTitle = cleanText(`${input.location ? `${input.location} ` : ""}${input.propertyType || "Emlak"} ${input.purpose || "İlanı"}`, 60);
  const metaDescription = cleanText(`${input.points[0]}. ${input.points[1]}. ${input.points[2]}.`, 155);
  const keywords = cleanKeywords([input.location, input.propertyType, input.purpose, ...input.points.flatMap((point) => point.split(" ").filter((word) => word.length > 5).slice(0, 2))]);
  return normalizeListingCopy({ title, description, seoTitle, metaDescription, keywords, slug: slugifyCopy(seoTitle || title) }, "local");
}

export function parseDeepSeekJson(content: string) {
  const cleaned = content.trim().replace(/^```json\s*/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as unknown;
}
