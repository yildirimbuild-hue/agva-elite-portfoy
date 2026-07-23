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

## CRM hattı ve ilan/SEO yazarı

Admin paneline iki operasyon aracı eklenmiştir:

- **CRM hattı:** Yapay zekâ danışmanından gelen talepleri `Yeni → Arandı → Gezdirildi → Teklif → Satıldı` aşamalarında yönetir. Her durum değişikliği tarihçeye yazılır; haftalık yeni talep, satış ve dönüşüm özeti gösterilir. Eski talepler geriye uyumlu olarak `Yeni` aşamasında açılır.
- **İlan & SEO yazarı:** Üç somut maddeyi mevcut DeepSeek ayarıyla profesyonel ilan başlığına, açıklamaya, SEO başlığına, meta açıklamasına, anahtar kelimelere ve URL metnine dönüştürür. API anahtarı yoksa test edilebilir, iddia üretmeyen yerel taslak verir. DeepSeek bağlantı hataları gizlenmez.

SEO alanları ilana aktarıldığında kayıtla birlikte saklanır ve `/ilan/[slug]` sayfasının gerçek Next.js metadata çıktısında kullanılır.

Özellik doğrulaması:

```bash
npm run typecheck
npm run test:features
npm run build
```

## Paket 1 — Yapay zekâ destekli randevu sistemi

İlan detay sayfasına ve mevcut ilan bağlamını bilen yapay zekâ danışmanına randevu akışı eklenmiştir.

### Müşteri akışı

1. Ziyaretçi bir ilan sayfasındayken yapay zekâ o ilanın referansını, başlığını ve konumunu kullanmaya devam eder.
2. “Bu ilan için randevu almak istiyorum”, “yerinde görmek istiyorum” veya benzeri bir istek randevu niyeti olarak algılanır.
3. Yapay zekâ gün ve saat uydurmaz; deterministik randevu motoruna `open_appointment_calendar` arayüz eylemi gönderir.
4. Müşteri yalnız gerçekten uygun gün ve saatleri görür.
5. Seçilen saat 5 dakika boyunca geçici olarak tutulur.
6. Ad, telefon ve isteğe bağlı not alındıktan sonra randevu kaydedilir.
7. Aynı anda CRM’de `Yeni` aşamasında bir müşteri talebi oluşur.
8. Randevu admin panelindeki **Randevular** ekranında görünür.

DeepSeek kapalı olsa bile ilan detayındaki **Takvimden randevu al** düğmesi çalışmaya devam eder.

### Takvim kuralları

Admin panelindeki **Randevular → Takvim ayarları** bölümünden şunlar yönetilir:

- Çalışma günleri
- Başlangıç ve bitiş saati
- Randevu süresi
- Randevular arasındaki ara süre
- En erken rezervasyon süresi
- En ileri rezervasyon günü
- Kapalı tarihler
- Danışman onaylı talep veya anında onay modu

Varsayılan saat dilimi `Europe/Istanbul` olarak sabittir.

### Demo veri dosyaları

- `data/appointment-state.json`: takvim ayarları, randevular ve geçici saat kilitleri
- `data/audit-log.json`: randevu oluşturma, durum değiştirme ve ayar değişiklikleri
- `data/error-events.json`: maskelenmiş teknik hata olayları

GitHub veri adaptörü kullanılıyorsa randevu verisi varsayılan olarak `data/appointment-state.json` yoluna yazılır. Ayrı yol için:

```bash
GITHUB_APPOINTMENTS_PATH=data/appointment-state.json
```

### Randevu test komutları

```bash
npm run typecheck
npm run test:features
npm run build
```

## Paket 2 — Tam müşteri kartı

CRM kartlarındaki **Müşteri kartı** düğmesi, her müşteri için tek bir Müşteri 360 ekranı açar.

### Müşteri kartı bölümleri

- **Özet:** ad, telefon, e-posta, müşteri tipi, sıcaklık, atanan danışman, CRM aşaması, son iletişim, sonraki işlem ve önemli notlar
- **İhtiyaçlar:** minimum/maksimum bütçe, para birimi, bölgeler, gayrimenkul türleri, oda, alan, finansman, satın alma zamanı, vazgeçilmez/tercih edilen/istenmeyen özellikler
- **Eşleşmeler:** uygun portföyler, puan, veri kapsamı, bütün nedenler, engel ayrıntıları ve ilgilenilenlere ekleme
- **İletişim:** arama, WhatsApp, not, randevu ve e-posta görüşme kayıtları; sonuç ve sonraki işlem tarihi
- **Randevular:** müşteriye bağlı tüm randevular ve durumları
- **İlanlar:** müşterinin ilgilendiği ilanları ekleme, kaldırma ve açma
- **CRM geçmişi:** müşterinin geçtiği tüm aşamalar ve tarihler

Profil doluluk yüzdesi, Paket 3 portföy–müşteri eşleştirme motoru için eksik verileri görünür hale getirir.

Yeni demo veri dosyası:

```text
data/interactions.json
```

GitHub veri adaptöründe ayrı bir yol kullanılacaksa:

```bash
GITHUB_INTERACTIONS_PATH=data/interactions.json
```

### Geçici admin şifresi

Yerel demo giriş şifresi:

```text
Agva-7K9m-R4p2!
```

`.env.local` içinde gerçek bir `ADMIN_PASSWORD` tanımlanırsa bu değer geçici şifrenin yerini alır. Canlı yayına çıkmadan önce mutlaka yeni ve yalnız size ait bir şifre belirleyin.

Admin adresi:

```text
http://localhost:3200/admin
```


## YGİS V1.2 Proje Kontrol Merkezi

Bu kaynak ağacı `VERSION`, `PROJECT-STATE.json`, kimlik, baseline, mimari, yol haritası, handoff, test matrisi ve `.ai-control` koordinasyon kayıtlarını taşır. Mevcut doğrulanmış çalışma modu `PROJECT_CONTEXT_ONLY` olduğundan ortak yazılabilir Git deposu kanıtlanana kadar paralel kaynak kod yazımı yapılmaz.

Release ZIP'i yalnız kullanıcının güncel mesajında bağımsız `PAKETLE` komutu ve geçen kalite kapılarıyla üretilir.

## Paket 3 — Portföy–Müşteri Eşleştirme

Admin panelinde müşteri ve portföyler çift yönlü, açıklanabilir ve deterministik kurallarla eşleştirilir. Eksik veri olumsuz sayılmaz; veri kapsamı ayrıca gösterilir. Sonuçlar yalnız admin oturumunda hesaplanır.


## Görünür özellik doğrulaması

Yeni veya değişen kullanıcı arayüzü özelliklerinde `UI-REACHABILITY-AND-USER-FLOW-GATE.md` zorunludur. Kod, API veya build başarısı tek başına özellik kabulü değildir.
