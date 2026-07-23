export const FAVORI_ILANLAR_DEPOLAMA_ANAHTARI = "ikisu:favori-ilanlar:v1";

type FavoriDeposu = {
  getItem(anahtar: string): string | null;
  setItem(anahtar: string, deger: string): void;
};

const normalizeKimlik = (deger: unknown) => {
  if (typeof deger !== "string") return "";
  const kimlik = deger.trim();
  return kimlik.length > 0 && kimlik.length <= 200 ? kimlik : "";
};

export function favoriIlanKimlikleriniCoz(rawValue: string | null): string[] {
  if (!rawValue || rawValue.length > 100_000) return [];

  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(normalizeKimlik).filter(Boolean))];
  } catch {
    return [];
  }
}

export function favoriIlanDurumunuDepodaDegistir(depo: FavoriDeposu, ilanKimligi: string) {
  const normalizedKimlik = normalizeKimlik(ilanKimligi);
  if (!normalizedKimlik) return false;

  const mevcutKimlikler = favoriIlanKimlikleriniCoz(depo.getItem(FAVORI_ILANLAR_DEPOLAMA_ANAHTARI));
  const favoride = mevcutKimlikler.includes(normalizedKimlik);
  const sonrakiKimlikler = favoride
    ? mevcutKimlikler.filter((kimlik) => kimlik !== normalizedKimlik)
    : [...mevcutKimlikler, normalizedKimlik];

  depo.setItem(FAVORI_ILANLAR_DEPOLAMA_ANAHTARI, JSON.stringify(sonrakiKimlikler));
  return !favoride;
}
