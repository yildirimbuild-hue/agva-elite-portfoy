# Baseline Doğrulama Raporu

- **Tarih:** 2026-07-18
- **Sürüm:** 0.1.0
- **Kaynak:** `agva-elite-portfoy-Paket-2-final (1).zip`
- **SHA-256:** `722e0cf76b0c852888047b887cb9ffaa2e067070ffc1044fda5e79d58e117ca1`
- **Ortam:** Yerel container / Node.js / production build
- **Kod değişikliği:** İşlevsel uygulama kodu değiştirilmedi; yalnız YGİS kontrol ve koordinasyon dosyaları hazırlandı.

## Çalıştırılan kontroller

| Kontrol | Sonuç |
|---|---|
| `npm ci` | PASS — 62 paket kuruldu, 0 güvenlik açığı |
| `npm run typecheck` | PASS — 0 TypeScript hatası |
| `npm run test:features` | PASS — 13/13 test |
| `npm run build` | PASS |
| Portföy veri doğrulaması | PASS — 24 benzersiz kayıt |
| Yayındaki ilan sayısı | 22 |
| `GET /` | HTTP 200 |
| `GET /admin` | HTTP 200 |
| `GET /api/listings` | HTTP 200 — 22 yayın kaydı |
| Yanlış admin şifresi | HTTP 401 |
| Demo admin şifresi | HTTP 200 |
| Admin oturum kontrolü | HTTP 200 / authenticated=true |
| `GET /api/health` | HTTP 503 `configuration_required` — yerel ortam için beklenen davranış; katalog, ayarlar ve randevu deposu okunabilir |

## Test kapsamı sınırları

- Gerçek `DEEPSEEK_API_KEY` ve `ELEVENLABS_API_KEY` olmadığı için canlı ücretli servis çağrısı yapılmadı.
- GitHub Contents ve Vercel Blob üretim ortamı bağlantısı doğrulanmadı.
- Tam görsel tarayıcı otomasyonu bu bootstrap turunda çalıştırılmadı.
- Test sırasında kalıcı müşteri/randevu verisi oluşturulmadı.

## Hüküm

**BASELINE PASS.** Uygulama mevcut Paket 2 işlevleriyle derleniyor, otomatik testleri geçiyor ve production sunucusunda temel HTTP akışları çalışıyor. Üretim servisleri için ortam değişkenleri ayrıca yapılandırılmalıdır.
