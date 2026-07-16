import { readFile } from "node:fs/promises";

const dataUrl = new URL("../data/listings.json", import.meta.url);
const listings = JSON.parse(await readFile(dataUrl, "utf8"));
const required = [
  "id",
  "reference",
  "title",
  "purpose",
  "propertyType",
  "location",
  "price",
  "oldPrice",
  "currency",
  "images",
  "published",
  "urgent"
];

if (!Array.isArray(listings) || listings.length === 0) {
  throw new Error("Portföy verisi boş olamaz.");
}

const ids = new Set();
for (const [index, listing] of listings.entries()) {
  const missing = required.filter((field) => listing[field] === undefined || listing[field] === "");
  if (missing.length) {
    throw new Error(`Kayıt ${index + 1} eksik alan içeriyor: ${missing.join(", ")}`);
  }
  if (ids.has(listing.id)) {
    throw new Error(`Mükerrer ilan id: ${listing.id}`);
  }
  ids.add(listing.id);
  if (listing.oldPrice > 0 && listing.oldPrice <= listing.price) {
    throw new Error(`Kayıt ${index + 1}: eski fiyat yeni fiyattan yüksek olmalıdır.`);
  }
}

console.log(`Portföy doğrulandı: ${listings.length} benzersiz kayıt.`);
