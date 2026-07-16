import { writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const entries = [
  ["Göksu Nehir Kıyısında Özel İskeleli Villa", "Satılık", "Villa", "Göksu", 38500000, "5+1", 310, 780],
  ["Yeşilçay'da Bahçeli Müstakil Yaşam", "Satılık", "Müstakil Ev", "Yeşilçay", 18900000, "4+1", 220, 620],
  ["Kilimli Kıyı Hattında Manzaralı Villa", "Satılık", "Villa", "Kilimli", 42750000, "6+2", 360, 940],
  ["Ağva Merkezde Yeni Daire", "Satılık", "Daire", "Ağva Merkez", 7650000, "3+1", 145, 0],
  ["Kurfallı'da Orman İçinde Taş Ev", "Satılık", "Müstakil Ev", "Kurfallı", 22400000, "4+1", 240, 1150],
  ["Bucaklı'da Yatırımlık İmarlı Arsa", "Satılık", "Arsa", "Bucaklı", 9800000, "—", 0, 1460],
  ["Göksu Manzaralı Sezonluk Villa", "Kiralık", "Villa", "Göksu", 185000, "4+1", 260, 540],
  ["Ağva Çarşıda Ticari Dükkân", "Kiralık", "Ticari", "Ağva Merkez", 65000, "Açık plan", 180, 0],
  ["Yeşilçay'da Dereye Yakın Arsa", "Satılık", "Arsa", "Yeşilçay", 12750000, "—", 0, 1980],
  ["Kilimli Yolunda Modern Orman Evi", "Satılık", "Villa", "Kilimli", 29750000, "4+2", 280, 820],
  ["İsaköy'de Geniş Tarla ve Proje Alanı", "Satılık", "Arsa", "İsaköy", 15400000, "—", 0, 4300],
  ["Ağva Merkezde Balkonlu 2+1", "Kiralık", "Daire", "Ağva Merkez", 34000, "2+1", 105, 0],
  ["Göksu'da Yenilenmiş Ahşap Ev", "Satılık", "Müstakil Ev", "Göksu", 16900000, "3+1", 175, 460],
  ["Gökmaslı'da Doğa İçinde Villa", "Satılık", "Villa", "Gökmaslı", 24800000, "4+1", 250, 1260],
  ["Bucaklı'da Köşe Parsel Arsa", "Satılık", "Arsa", "Bucaklı", 6750000, "—", 0, 920],
  ["Yeşilçay'da Teraslı Çatı Dubleksi", "Satılık", "Daire", "Yeşilçay", 11250000, "4+1", 195, 0],
  ["Kurfallı'da Şömineli Orman Villası", "Kiralık", "Villa", "Kurfallı", 125000, "4+1", 235, 740],
  ["Ağva Merkezde Pansiyon İşletmesi", "Satılık", "Ticari", "Ağva Merkez", 46500000, "12 oda", 680, 850],
  ["Göksu'da İki Katlı Bahçeli Ev", "Satılık", "Müstakil Ev", "Göksu", 19750000, "5+1", 245, 570],
  ["Kilimli'de Deniz Görüşlü Arsa", "Satılık", "Arsa", "Kilimli", 18400000, "—", 0, 1720],
  ["Yeşilçay'da Eşyalı Kiralık Daire", "Kiralık", "Daire", "Yeşilçay", 42000, "2+1", 112, 0],
  ["İsaköy'de Çiftlik Evi ve Bahçe", "Satılık", "Müstakil Ev", "İsaköy", 27900000, "5+2", 330, 3400],
  ["Gökmaslı'da Butik Otel Projesi", "Satılık", "Ticari", "Gökmaslı", 53500000, "16 oda", 920, 2100],
  ["Bucaklı'da Dere Cepheli Villa", "Satılık", "Villa", "Bucaklı", 31250000, "5+1", 295, 980]
];

const images = [
  "/images/goksu-house.webp",
  "/images/forest-house.webp",
  "/images/coast-house.webp",
  "/images/hero-agva.webp"
];

const now = "2026-07-16T06:30:00.000Z";
const listings = entries.map(([title, purpose, propertyType, location, price, rooms, grossArea, landArea], index) => ({
  id: randomUUID(),
  reference: `IKS-${String(index + 1).padStart(4, "0")}`,
  title,
  slug: `agva-portfoy-${index + 1}`,
  purpose,
  propertyType,
  location,
  district: "Şile / İstanbul",
  price,
  currency: "TRY",
  rooms,
  bathrooms: propertyType === "Arsa" || propertyType === "Ticari" ? 0 : index % 3 + 1,
  grossArea,
  netArea: grossArea ? Math.round(grossArea * 0.82) : 0,
  landArea,
  floor: propertyType === "Daire" ? `${index % 3 + 1}. kat` : propertyType === "Arsa" ? "—" : "2 kat",
  description: `${location} bölgesinde ${String(propertyType).toLocaleLowerCase("tr-TR")} portföyü. Konum, kullanım potansiyeli ve detaylı sunum bilgileri için portföy danışmanıyla görüşebilirsiniz.`,
  features: propertyType === "Arsa"
    ? ["Yola cepheli", "Yatırım potansiyeli", "Doğa manzarası"]
    : ["Doğa ile iç içe", "Geniş yaşam alanı", index % 2 ? "Bahçe kullanımı" : "Manzara"],
  images: [images[index % images.length]],
  featured: index < 4,
  published: index < 22,
  isDemo: true,
  createdAt: now,
  updatedAt: new Date(Date.parse(now) + index * 60000).toISOString()
}));

await writeFile(new URL("../data/listings.json", import.meta.url), `${JSON.stringify(listings, null, 2)}\n`, "utf8");
console.log(`${listings.length} örnek portföy üretildi.`);
