# İKİSU Emlak — CRM ve İlan/SEO Yazarı Test Raporu

Tarih: 17 Temmuz 2026

## Proje doğrulaması

- Proje: İKİSU Emlak / Ağva–Şile portföy uygulaması
- Altyapı: Next.js 16.2.9, React 19.2.4, TypeScript
- Mevcut yapay zekâ sağlayıcısı: DeepSeek
- DeepSeek sunucu adresi: `https://api.deepseek.com/chat/completions`
- Gemini veya Google Generative AI kodu eklenmedi; kaynak taramasında eşleşme bulunmadı.

## Eklenen özellikler

### CRM hattı

- Aşamalar: `Yeni → Arandı → Gezdirildi → Teklif → Satıldı`
- Her aşama değişikliği tarihçeye kaydedilir.
- Eski talepler otomatik ve geriye uyumlu biçimde `Yeni` aşamasında açılır.
- Kanban görünümü, arama, WhatsApp, arama, ileri/geri taşıma ve doğrudan durum seçimi eklendi.
- Haftalık yeni talep, haftalık satış, aktif talep ve dönüşüm yüzdesi eklendi.
- Yerel JSON ve mevcut GitHub veri adaptörü korunarak kullanıldı.

### İlan & SEO yazarı

- Tam olarak üç somut madde alır.
- Mevcut şifreli DeepSeek anahtarını ve mevcut model ayarını kullanır.
- Çıktılar: ilan başlığı, ilan açıklaması, SEO başlığı, meta açıklaması, anahtar kelimeler ve URL metni.
- SEO başlığı 60, meta açıklaması 155 karakterle sınırlandırılır.
- DeepSeek anahtarı bulunmadığında test için iddia üretmeyen yerel güvenli taslak oluşturur.
- DeepSeek bağlantısı hata verirse hata gizlenmez; kullanıcıya açıkça gösterilir.
- Çıktı yeni ilan formuna aktarılabilir.
- SEO alanları ilan kaydına yazılır ve gerçek `/ilan/[slug]` Next.js metadata çıktısında kullanılır.

## Otomatik testler

### TypeScript

Komut: `npm run typecheck`

Sonuç: **Başarılı — 0 hata**

### Özellik testleri

Komut: `npm run test:features`

Sonuç: **5/5 başarılı**

1. Üç madde zorunluluğu
2. Yerel güvenli taslak karakter sınırları
3. DeepSeek çıktısı normalizasyonu
4. Eski müşteri taleplerinin geriye uyumlu dönüşümü
5. Haftalık CRM dönüşüm hesabı

### Production build

Komut: `npm run build`

Sonuç: **Başarılı**

- Veri doğrulama: 24 benzersiz portföy kaydı
- Next.js production derleme: başarılı
- TypeScript build denetimi: başarılı
- Yeni rotalar derlendi:
  - `/api/admin/assistant/seo`
  - `/api/admin/leads`
  - `/admin`
  - `/ilan/[slug]`

### Uçtan uca çalışan sunucu testi

Production sunucusu yerel olarak başlatıldı ve gerçek HTTP istekleriyle test edildi:

- Admin girişi: başarılı
- Admin HTML içinde `CRM hattı`: bulundu
- Admin HTML içinde `İlan & SEO yazarı`: bulundu
- Eski, durum alanı olmayan talep: `Yeni` olarak normalize edildi
- Talep `Arandı` aşamasına taşındı
- Aşama tarihçesi 1 kayıttan 2 kayda çıktı
- SEO yazarı API isteği: başarılı
- Test ilanı oluşturma: başarılı
- SEO başlığı ilan kaydında saklandı
- Meta açıklaması ilan kaydında saklandı
- İlan detay HTML’inde SEO başlığı render edildi
- İlan detay HTML’inde meta açıklaması render edildi
- Test ilanı silindi
- Test verileri temizlendi ve özgün 24 kayıt geri yüklendi

## DeepSeek canlı çağrı sınırı

Yüklenen ZIP içinde gerçek `DEEPSEEK_API_KEY` bulunmadığı için ücretli/dış DeepSeek servisine canlı çağrı yapılmadı. Bunun yerine:

- Mevcut DeepSeek servis adresi ve şifreli ayar katmanı kullanıldı.
- API istek yapısı production build’den geçti.
- DeepSeek JSON çıktısının doğrulama/karakter sınırı testleri geçti.
- Anahtarsız yerel uçtan uca akış gerçek sunucuda test edildi.

Gerçek anahtarla son kontrol için admin panelinde **Site ve AI ayarları → Bağlantıyı test et** düğmesi kullanılmalıdır.

## Çalıştırma

```powershell
npm install
copy .env.example .env.local
npm run dev
```

Site: `http://localhost:3200`

Admin: `http://localhost:3200/admin`

---

# Paket 1 — Yapay Zekâ Destekli Randevu Sistemi

Tarih: 17 Temmuz 2026

## Korunan mevcut davranış

- İlan detay sayfasında açılan yapay zekâ, mevcut ilanın referansını ve başlığını tanımaya devam eder.
- “Bu ilan” ifadesi açık olan portföyü ifade eder.
- Kullanıcı farklı bir IKS referansı yazarsa yanlış ilana randevu oluşturulmaz; önce doğru ilan sayfası açılır.
- DeepSeek kapalı olduğunda ilan sayfasındaki bağımsız **Takvimden randevu al** düğmesi çalışmaya devam eder.

## Otomatik özellik testleri

Komut: `npm run test:features`

Sonuç: **8/8 başarılı**

Yeni randevu testleri:

1. Çalışma günleri ve kapalı tarihlerin uygulanması
2. Dolu randevunun aynı saati müsait listeden kaldırması
3. Beş dakikalık geçici kilidin ikinci müşteriyi engellemesi

Önceki CRM ve ilan/SEO testlerinin tamamı da geçmeye devam etti.

## TypeScript

Komut: `npm run typecheck`

Sonuç: **Başarılı — 0 hata**

## Production build

Komut: `npm run build`

Sonuç: **Başarılı**

Yeni derlenen rotalar:

- `/api/appointments/availability`
- `/api/appointments/hold`
- `/api/appointments`
- `/api/admin/appointments`
- `/api/admin/appointment-settings`

## Gerçek çalışan sunucu testi

Production sunucusu gerçek HTTP istekleriyle test edildi.

Sonuç: **10/10 başarılı**

1. İlan sayfasında randevu düğmesi render edildi.
2. Yapay zekâ açık ilanı doğru referansla tanıdı.
3. Farklı ilan referansı verilince yanlış ilan koruması çalıştı.
4. Müsaitlik motoru Türkiye saat diliminde boş saat üretti.
5. Aynı saat için ikinci geçici kilit HTTP 409 ile reddedildi.
6. Randevu kaydı `Talep Alındı` durumunda oluşturuldu.
7. Randevu admin listesine ve CRM’de `Yeni` aşamasına bağlandı.
8. Admin randevu durumunu `Onaylandı` olarak değiştirdi.
9. Takvim ayarları ve kapalı tarih kaydı güncellendi.
10. Admin menüsünde **Randevular** bölümü render edildi.

## Veri temizliği

Uçtan uca testte oluşturulan müşteri, randevu, kilit, audit ve hata kayıtları test sonunda geri alındı. Teslim paketinde:

- Test randevusu yoktur.
- “Paket Bir Test” müşterisi yoktur.
- Başlangıç takvimi temizdir.

## Sağlık endpoint notu

`/api/health`, randevu veri deposunu `readable: true` olarak doğruladı. Test ortamında GitHub/Vercel Blob gibi production değişkenleri bilerek tanımlanmadığı için endpoint genel olarak HTTP 503 `configuration_required` döndürdü. Bu, randevu modülü hatası değil; production dağıtım değişkenlerinin henüz girilmediğini bildiren mevcut güvenlik davranışıdır.

## Canlı DeepSeek sınırı

Gerçek DeepSeek anahtarı teslim paketine dahil edilmedi. Randevu niyeti ve açık ilan bağlamı API anahtarı olmadan deterministik olarak test edildi. Genel serbest sohbetin canlı DeepSeek testi, kullanıcının mevcut anahtarıyla **Site ve AI ayarları → Bağlantıyı test et** üzerinden yapılmalıdır.


## YGİS Bootstrap Baseline Yeniden Doğrulaması — 18 Temmuz 2026

- `npm ci`: PASS, 0 güvenlik açığı
- `npm run typecheck`: PASS
- `npm run test:features`: PASS — 13/13
- `npm run build`: PASS
- HTTP smoke: ana sayfa, admin, ilan API, doğru/yanlış login ve session PASS
- `/api/health`: üretim ortam değişkenleri eksik olduğu için beklenen HTTP 503 `configuration_required`; katalog, ayarlar ve randevu deposu okunabilir

## Release doğrulaması — 2026-07-18

- `npm ci`: PASS — 0 güvenlik açığı
- `npm run typecheck`: PASS
- `npm run test:features`: PASS — 13/13
- `npm run build`: PASS
- Production start: PASS
- Ana sayfa: HTTP 200
- Admin: HTTP 200
- İlan API: HTTP 200 — 22 yayın ilanı
- Yanlış admin parolası: HTTP 401
- Doğru demo admin parolası: HTTP 200
- Session: HTTP 200 / authenticated true
- Health: beklenen HTTP 503 `configuration_required`; yerel depolar readable
- Canlı DeepSeek/ElevenLabs: gerçek anahtar olmadığı için test edilmedi
- Tarayıcı tabanlı görsel E2E: bu release turunda çalıştırılmadı

## 0.2.0-rc.2 Test Sonucu

- `npm ci`: PASS — 0 vulnerability
- `npm run typecheck`: PASS
- `npm run test:features`: PASS — 20/20
- `npm run validate:data`: PASS — 24 benzersiz portföy
- `npm run build`: PASS
- Production start ve HTTP smoke: PASS
- Yetkisiz `/api/admin/matches`: 401
- Müşteri → portföy: 200
- Portföy → müşteri: 200
- Sentetik müşteri test sonunda temizlendi.
- Bağımsız review: PENDING

