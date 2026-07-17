# İKİSU Emlak

Ağva ve Şile bölgesindeki satılık ve kiralık villa, müstakil ev, daire, arsa ve
ticari portföyleri yöneten tam kapsamlı emlak uygulaması.

## Ürün kapsamı

- 24 kayıtlık örnek portföy; 22 yayında, 2 taslak
- İşlem, emlak tipi, bölge, anahtar kelime ve sıralama filtreleri
- İlan detay sunumu ve mobil uyumlu katalog
- İlan bazlı hazır mesajla WhatsApp geçişi ve telefonla arama
- Canlı portföyü ve firma profilini okuyan DeepSeek yapay zekâ danışmanı
- Kalıcı `/ilan/...` detay sayfaları ve AI komutuyla otomatik ilan yönlendirmesi
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
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_ID=EXAVITQu4vr4xnSDxMaL
ELEVENLABS_MODEL=eleven_flash_v2_5
BLOB_READ_WRITE_TOKEN=vercel-blob-read-write-token
```

WhatsApp numarası yalnız rakamlardan ve ülke koduyla yazılmalıdır. API anahtarı
yalnız sunucuda kalır; tarayıcıya gönderilmez. Numara veya anahtar yokken arayüz
sahte bir iletişim noktası üretmez ve eksik yapılandırmayı açıkça bildirir.
ElevenLabs anahtarı alternatif olarak admin panelinden AES-256-GCM ile şifreli
biçimde kaydedilebilir. Sesli yanıtlar ücretsiz planla uyumlu hazır bir sesle
(Sarah) başlar; ses kimliği, model ve ses karakteri admin panelinden
değiştirilebilir. Kütüphane sesleri (örn. Deniz) API üzerinden yalnız ücretli
ElevenLabs planlarında çalışır.

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

Admin paneli yerel geliştirmede görselleri `public/uploads/` klasörüne yazar.
Vercel'de bağlı bir Blob mağazası olduğunda aynı rota görselleri otomatik olarak
kalıcı Vercel Blob deposuna yükler. Her dosya en fazla 8 MB olabilir ve yalnız
JPG, PNG veya WebP kabul edilir. Blob anahtarı tarayıcıya gönderilmez.

## GitHub veri adaptörü

Aşağıdaki sunucu ortam değişkenleri tanımlandığında portföy JSON'u yerel dosya
yerine GitHub Contents API üzerinden okunur ve yazılır:

- `GITHUB_TOKEN`
- `GITHUB_DATA_REPOSITORY`
- `GITHUB_DATA_BRANCH`
- `GITHUB_DATA_PATH`

GitHub anahtarı yalnız sunucuda tutulmalıdır. Admin oturumu HttpOnly ve SameSite
çerezle korunur.

Vercel üzerinde GitHub veri adaptörü zorunludur. Yerel JSON'a üretim ortamında
yazma girişimi açık hata verir; başarılı görünerek veri kaybetmez. Veri deposu
olarak ayrı, tercihen özel bir GitHub deposu kullanın ve başlangıçta bu projedeki
`data/listings.json` dosyasını aynı yola kopyalayın. İnce kapsamlı token'a yalnız
bu veri deposunda `Contents: Read and write` yetkisi verin.

## Yayın mimarisi

Admin paneli ve API rotaları nedeniyle uygulama statik GitHub Pages sitesi
değildir. Vercel üzerinde Next.js projesi olarak dağıtılır.

### Vercel dağıtım kontrol listesi

1. GitHub deposunu Vercel'e içe aktarın; framework `Next.js`, proje kökü depo
   kökü ve build komutu `npm run build` olarak kalabilir.
2. Vercel Storage bölümünde herkese açık bir Blob mağazası oluşturup projeye
   bağlayın. `BLOB_READ_WRITE_TOKEN` otomatik eklenir.
3. Aşağıdaki değişkenleri hem `Preview` hem `Production` ortamlarına ekleyin:
   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - `DEEPSEEK_API_KEY`
   - `DEEPSEEK_MODEL=deepseek-v4-flash`
   - `NEXT_PUBLIC_WHATSAPP_NUMBER`
   - `NEXT_PUBLIC_PHONE_NUMBER`
   - `GITHUB_TOKEN`
   - `GITHUB_DATA_REPOSITORY`
   - `GITHUB_DATA_BRANCH`
   - `GITHUB_DATA_PATH`
4. Dağıtımdan sonra `/api/health` adresini açın. Tüm servisler hazırsa HTTP 200
   ve `status: ready` döner.
5. Admin panelinden bir taslak ilan ve bir test görseli ekleyin; yeni dağıtım
   başlattıktan sonra ikisinin de kaldığını doğrulayın.

Vercel gerçek alan adı olmadan otomatik bir `*.vercel.app` HTTPS adresi verir.
Uygulamadaki bağlantılar göreli, oturum çerezi origin tabanlı olduğu için geçici
Vercel alan adında ek kod değişikliği gerekmez. Daha sonra özel alan adı aynı
projeye bağlanabilir.

Vercel build sırasında `scripts/check-deployment.mjs` çalışır. Zorunlu bir ortam
değişkeni eksik veya zayıfsa bozuk bir dağıtım üretmek yerine anlaşılır hata ile
build'i durdurur. Yerel geliştirmede bu zorunluluk uygulanmaz.

## Kaynaklar

- Ağva yer anlatısı: `https://sile.gov.tr/agva`
- İlk veri şeması: `neidhan11/ai-storage/notes/project-real-estate-scraper.md`
- Mimari görseller: proje için yapay zekâ ile oluşturulmuş demo görselleridir.
