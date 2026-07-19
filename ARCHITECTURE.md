# Mimari

## Genel akış

```text
React / Next.js UI
        ↓
Next.js App Router ve API rotaları
        ↓
İş kuralları / servisler
        ↓
Store / repository katmanı
        ↓
Yerel JSON | GitHub Contents | Vercel Blob | Harici AI servisleri
```

## Ana modüller

### Kullanıcı arayüzü

- `src/components/PortfolioApp.tsx`: katalog ve ana uygulama akışı
- `src/components/ListingDetail.tsx`: ilan detay deneyimi
- `src/components/AIConcierge.tsx`: ilan bağlamlı yapay zekâ danışmanı
- `src/components/AppointmentScheduler.tsx`: deterministik randevu seçimi

### Admin arayüzü

- `src/components/AdminPanel.tsx`: ilan, CRM, randevu ve ayar yönetimi
- `src/components/CustomerCardModal.tsx`: müşteri 360 görünümü
- `src/components/AdminLogin.tsx`: admin giriş akışı

### İş kuralı ve veri katmanı

- `listing-store.ts`: ilan okuma/yazma ve GitHub adaptörü
- `lead-store.ts`, `lead-pipeline.ts`: CRM kayıtları ve aşama geçmişi
- `appointment-engine.ts`, `appointment-store.ts`: müsaitlik, geçici kilit ve randevu kalıcılığı
- `customer-card.ts`, `interaction-store.ts`: müşteri profili ve iletişim geçmişi
- `auth.ts`: admin parola ve oturum doğrulaması
- `site-settings-store.ts`: yapay zekâ, ses ve iletişim ayarları

## Veri dosyaları

- `data/listings.json`
- `data/company.json`
- `data/leads.json`
- `data/appointment-state.json`
- `data/interactions.json`
- `data/audit-log.json`
- `data/error-events.json`

## Kritik mimari sınırlar

- Yapay zekâ takvim müsaitliği, benzersizlik, yetki ve eşleştirme puanı vermemelidir; bunlar deterministik kodla hesaplanır.
- Üretimde yerel JSON'a yazma güvenilir kalıcılık sayılmaz; GitHub adaptörü veya ilişkisel veritabanı gerekir.
- Kısmi müşteri güncellemesi belirtilmeyen alanları silmez.
- Admin yetkisi yalnız arayüz gizleme ile değil API tarafında doğrulanır.

## Çoklu AI çalışma modu

Mevcut doğrulanmış mod `PROJECT_CONTEXT_ONLY`'dir. Ortak yazılabilir Git deposu/worktree kanıtlanana kadar tek kanonik yazar; diğer ajanlar review, test ve patch önerisi rolünde çalışır.
