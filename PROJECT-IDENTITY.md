# Proje Kimliği

## Kimlik

- **Proje:** İKİSU Emlak — Ağva Elite Portföy
- **Proje kimliği:** `ikisu-emlak-agva-elite-portfoy`
- **Doğrulanan sürüm:** `0.1.0`
- **Proje seviyesi:** S2 — operasyonel ürün adayı
- **Çalışma modu:** `PROJECT_CONTEXT_ONLY`
- **Kaynak paket:** `agva-elite-portfoy-Paket-2-final (1).zip`
- **Kaynak SHA-256:** `722e0cf76b0c852888047b887cb9ffaa2e067070ffc1044fda5e79d58e117ca1`

## Teknoloji kanıtları

- `package.json`: Next.js 16.2.9, React 19.2.4, TypeScript 5
- Uygulama kökü: Next.js App Router yapısı
- Ana kullanıcı rotaları: `/`, `/ilan/[slug]`, `/admin`
- Temel API alanları: ilanlar, admin, yapay zekâ, randevular, CRM ve etkileşim kayıtları
- Veri kaynakları: `data/*.json`; isteğe bağlı GitHub Contents ve Vercel Blob adaptörleri

## Ürün kimliği

Ağva ve Şile bölgesinde satılık/kiralık villa, müstakil ev, daire, arsa ve ticari portföyleri yöneten; ilan kataloğu, yapay zekâ danışmanı, admin paneli, CRM, randevu ve müşteri 360 özellikleri bulunan emlak uygulamasıdır.

## GATE 0 hükmü

**PASS.** Proje adı, marka, manifest, rota yapısı, veri dosyaları ve mevcut özellik raporları birbiriyle uyumludur. Dosya adındaki “final” ibaresi sürüm kanıtı olarak kullanılmamış; sürüm `package.json` ve baseline testleriyle `0.1.0` olarak kayda alınmıştır.
