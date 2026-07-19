# Değişiklik Raporu

## Yeni dosyalar

- `src/lib/lead-pipeline.ts`
- `src/lib/listing-copy.ts`
- `src/app/api/admin/assistant/seo/route.ts`
- `data/leads.json`
- `tests/feature-smoke.test.mjs`
- `TEST-RAPORU.md`
- `DEGISIKLIK-RAPORU.md`

## Güncellenen dosyalar

- `src/lib/types.ts`
- `src/lib/lead-store.ts`
- `src/lib/listing-store.ts`
- `src/app/api/admin/leads/route.ts`
- `src/app/api/admin/assistant/draft/route.ts`
- `src/app/ilan/[slug]/page.tsx`
- `src/components/AdminPanel.tsx`
- `src/app/globals.css`
- `package.json`
- `package-lock.json`
- `README.md`

## Korunan sistemler

- Mevcut DeepSeek genel danışman rotası değiştirilmedi.
- DeepSeek API anahtarının sunucuda şifreli saklanması korundu.
- ElevenLabs entegrasyonu değiştirilmedi.
- Yerel JSON ve GitHub veri adaptörleri korundu.
- Mevcut 24 ilan verisi değiştirilmedi.

## Paket 1 — Randevu sistemi

### Yeni dosyalar

- `src/components/AppointmentScheduler.tsx`
- `src/lib/appointment-engine.ts`
- `src/lib/appointment-store.ts`
- `src/lib/audit-store.ts`
- `src/lib/error-store.ts`
- `src/app/api/appointments/availability/route.ts`
- `src/app/api/appointments/hold/route.ts`
- `src/app/api/appointments/route.ts`
- `src/app/api/admin/appointments/route.ts`
- `src/app/api/admin/appointment-settings/route.ts`
- `data/appointment-state.json`
- `data/audit-log.json`
- `data/error-events.json`

### Güncellenen alanlar

- İlan detay sayfasına doğrudan randevu düğmesi eklendi.
- Mevcut AI ilan bağlamı korunarak randevu niyeti deterministik takvim eylemine bağlandı.
- Admin paneline randevu listesi, durum yönetimi ve çalışma takvimi ayarları eklendi.
- Randevu kaydı CRM’de `Yeni` aşamasında müşteri talebi oluşturur.
- `/api/health` randevu veri deposunun okunabilirliğini de kontrol eder.
- Özellik testlerine çalışma günü, kapalı tarih, dolu saat ve çift rezervasyon kilidi testleri eklendi.


## YGİS V1.2 Bootstrap Kontrol Dosyaları

İşlevsel uygulama kodu değiştirilmeden proje kimliği, sürüm, baseline, mimari, yol haritası, handoff, güvenlik/test kayıtları ve çoklu AI koordinasyon alanı eklendi.

## Bootstrap release kapanışı — 2026-07-18

- İşlevsel uygulama kodu değiştirilmedi.
- Proje Kontrol Merkezi ve `.ai-control` release durumuna geçirildi.
- `WS-B0-BOOTSTRAP` workstream'i REVIEWED, INTEGRATED ve RELEASED olarak kaydedildi.

## Paket 3 — Portföy–Müşteri Eşleştirme — 0.2.0-rc.2

Müşteri kartına otomatik portföy önerileri, portföy tablosuna uygun müşteri görünümü, admin-only eşleştirme API'si ve açıklanabilir deterministik kural motoru eklendi. Fiziksel veri migration'ı yapılmadı.

