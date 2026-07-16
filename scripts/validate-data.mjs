import { readFile } from "node:fs/promises";

const dataUrl = new URL("../src/data/listings.json", import.meta.url);
const listings = JSON.parse(await readFile(dataUrl, "utf8"));
const required = [
  "ilan_id",
  "ilan_basligi",
  "para_birimi",
  "konum",
  "satici_tipi",
  "gorsel_url",
  "tarama_tarihi",
  "kategori",
  "kod",
  "status"
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
  if (ids.has(listing.ilan_id)) {
    throw new Error(`Mükerrer ilan_id: ${listing.ilan_id}`);
  }
  ids.add(listing.ilan_id);
}

console.log(`Portföy doğrulandı: ${listings.length} benzersiz kayıt.`);
