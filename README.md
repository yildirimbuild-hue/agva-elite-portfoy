# İKİSU Emlak

Ağva ve Şile bölgesindeki satılık ve kiralık villa, müstakil ev, daire, arsa ve
ticari portföyleri yöneten tam kapsamlı emlak uygulaması.

## Ürün kapsamı

- 24 kayıtlık örnek portföy; 22 yayında, 2 taslak
- İşlem, emlak tipi, bölge, anahtar kelime ve sıralama filtreleri
- İlan detay sunumu ve mobil uyumlu katalog
- İlan bazlı hazır mesajla WhatsApp geçişi ve telefonla arama
- Canlı portföyü ve firma profilini okuyan DeepSeek yapay zekâ danışmanı
- Yönetilebilir “Çok acil” ve eski/yeni fiyat etiketleri
- Şifreli admin oturumu
- İlan ekleme, düzenleme, yayın/taslak değiştirme ve silme
- Bilgisayardan JPG, PNG ve WebP görsel yükleme
- JSON dışa aktarma
- Build öncesi eksik alan ve mükerrer kayıt kontrolü
- İsteğe bağlı sunucu tarafı GitHub veri adaptörü

Örnek ilanların tamamı `isDemo: true` olarak işaretlenmiştir. Gerçek portföy
admin panelinden girildikçe örnek kayıtlar silinebilir.

## Yerel kurulum

```bash
npm install
copy .env.example .env.local
npm run dev
```

Site: `http://localhost:3200`

Admin: `http://localhost:3200/admin`

`.env.local` içinde güçlü bir `ADMIN_PASSWORD` ve uzun, rastgele bir
`ADMIN_SESSION_SECRET` kullanılmalıdır. Bu dosya Git tarafından izlenmez.

İletişim ve yapay zekâ için aşağıdaki değerler de sunucu ortamına eklenir:

```bash
NEXT_PUBLIC_WHATSAPP_NUMBER=905XXXXXXXXX
NEXT_PUBLIC_PHONE_NUMBER=+905XXXXXXXXX
DEEPSEEK_API_KEY=your-deepseek-api-key
DEEPSEEK_MODEL=deepseek-v4-flash
```

WhatsApp numarası yalnız rakamlardan ve ülke koduyla yazılmalıdır. API anahtarı
yalnız sunucuda kalır; tarayıcıya gönderilmez. Numara veya anahtar yokken arayüz
sahte bir iletişim noktası üretmez ve eksik yapılandırmayı açıkça bildirir.

## Veri

Yerel veri dosyası: `data/listings.json`

Firma profili ve yapay zekânın firma bilgisi: `data/company.json`

Örnek veriyi yeniden üretmek için:

```bash
npm run seed
```

Veri doğrulama ve production build:

```bash
npm run build
```

## Görseller

Admin paneli görselleri geliştirme ortamında `public/uploads/` klasörüne yazar.
Her dosya en fazla 8 MB olabilir ve yalnız JPG, PNG veya WebP kabul edilir.

Kalıcı sunucu diski olmayan üretim ortamlarında bir obje depolama sağlayıcısı
eklenmelidir. Tarayıcı tarafına GitHub anahtarı veya depolama anahtarı konmaz.

## GitHub veri adaptörü

Aşağıdaki sunucu ortam değişkenleri tanımlandığında portföy JSON'u yerel dosya
yerine GitHub Contents API üzerinden okunur ve yazılır:

- `GITHUB_TOKEN`
- `GITHUB_DATA_REPOSITORY`
- `GITHUB_DATA_BRANCH`
- `GITHUB_DATA_PATH`

GitHub anahtarı yalnız sunucuda tutulmalıdır. Admin oturumu HttpOnly ve SameSite
çerezle korunur.

## Yayın mimarisi

Admin paneli ve API rotaları nedeniyle uygulama artık statik GitHub Pages sitesi
değildir. Node.js destekleyen Vercel, Render, Railway veya benzeri bir platformda
çalıştırılmalıdır. GitHub deposu kaynak kod ve isteğe bağlı portföy veri deposu
olarak kullanılmaya devam eder.

## Kaynaklar

- Ağva yer anlatısı: `https://sile.gov.tr/agva`
- İlk veri şeması: `neidhan11/ai-storage/notes/project-real-estate-scraper.md`
- Mimari görseller: proje için yapay zekâ ile oluşturulmuş demo görselleridir.
