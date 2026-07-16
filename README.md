# İKİSU Private Estates

Ağva'nın nehir, orman ve kıyı hattındaki seçkin yaşam alanları için hazırlanmış,
editoryal sunum odaklı emlak portföyü.

## Tasarım ilkesi

Bu ürün bir ilan portalı değildir. Amaç, az sayıda nitelikli portföyü yer duygusu,
mimari anlatı ve tam ekran sunumlarla görünür kılmaktır. İlk sürümdeki üç kayıt,
veri ve tasarım akışını göstermek için açıkça `demo` olarak işaretlenmiştir.

## Çalıştırma

```bash
npm install
npm run dev
```

Üretim kontrolü:

```bash
npm run build
```

Statik çıktı `out/` klasörüne yazılır.

## Portföy verisi

Kaynak dosya: `src/data/listings.json`

Temel alanlar, GitHub'daki `neidhan11/ai-storage` deposunda bulunan
`notes/project-real-estate-scraper.md` şemasıyla uyumludur:

- `ilan_id`
- `ilan_basligi`
- `fiyat`
- `para_birimi`
- `url`
- `konum`
- `satici_tipi`
- `gorsel_url`
- `tarama_tarihi`

Sunum için `kategori`, `kod`, `etiket`, `ozet`, `nitelikler`, `hikaye` ve `status`
alanları eklenmiştir. `npm run validate:data`, eksik alanları ve mükerrer ilan
kimliklerini build öncesinde engeller.

## Yayın

`.github/workflows/deploy-pages.yml`, `main` dalına gönderilen her değişiklikte
statik siteyi oluşturur. GitHub deposunda **Settings → Pages → Source** alanı
`GitHub Actions` olarak seçilmelidir.

## Kaynak disiplini

- Ağva yer anlatısı: T.C. Şile Kaymakamlığı, `https://sile.gov.tr/agva`
- Teknik yayın modeli: Next.js static export ve GitHub Pages
- Görseller: Bu proje için yapay zekâ ile üretilmiş konsept görseller; gerçek ilan
  fotoğrafı değildir.
