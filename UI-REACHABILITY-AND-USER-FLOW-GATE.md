# UI ERİŞİLEBİLİRLİK VE GERÇEK KULLANICI AKIŞI KAPISI
## YGİS V1.2.2 Zorunlu Ek Politika

**Dosya adı:** `UI-REACHABILITY-AND-USER-FLOW-GATE.md`
**Statü:** Zorunlu proje politikası
**Amaç:** Kodda bulunan fakat kullanıcı tarafından açılamayan, ulaşılamayan veya tamamlanamayan özelliklerin “tamamlandı” ya da “test edildi” sayılmasını engellemek.

---

## 1. Ana hüküm

Bir özellik yalnızca kodu, API’si veya ekran gövdesi mevcut olduğu için tamamlanmış sayılmaz.

Özellik ancak gerçek kullanıcı tarafından:

1. görülebiliyor,
2. doğru giriş noktasından açılabiliyor,
3. beklenen işlemler tamamlanabiliyor,
4. sonucu kalıcı olarak doğrulanabiliyor,
5. hata ve boş durumları görülebiliyor

ise kullanıcıya teslim edilmiş sayılır.

Aşağıdaki durumlar tek başına başarı kanıtı değildir:

- Kod içinde bileşenin bulunması
- API’nin `200` dönmesi
- Unit testlerin geçmesi
- TypeScript veya lint kontrolünün geçmesi
- Production build’in başarılı olması
- Görünmeyen bir bileşenin derlenmesi
- Doğrudan URL veya geliştirici çağrısıyla ekranın açılması
- Ekran gövdesinin yazılmış fakat menü, buton, sekme veya rota bağlantısının eksik olması

---

## 2. Zorunlu erişilebilirlik kapısı

Her yeni görünür özellik için aşağıdaki zincirin tamamı doğrulanır:

```text
Kullanıcı rolü
→ Başlangıç ekranı
→ Menü / buton / sekme / bağlantı
→ Hedef ekran veya modal
→ Ana işlem
→ Başarı sonucu
→ Kalıcılık kontrolü
→ Geri dönüş / yeniden açma
```

Zincirin herhangi bir halkası eksikse:

```text
FEATURE_REACHABILITY: FAIL
RELEASE_HUKMU: CHANGES_REQUESTED
```

verilir.

Kodda hedef ekranın bulunması, giriş noktası eksikliğini telafi etmez.

---

## 3. Her görünür özellik için zorunlu kabul sözleşmesi

Her kullanıcı arayüzü özelliğinde aşağıdaki alanlar yazılmalıdır:

```text
FEATURE_ID:
KULLANICI_ROLU:
BASLANGIC_EKRANI:
GIRIS_NOKTASI:
GIRIS_NOKTASI_METNI:
HEDEF_EKRAN:
ANA_ISLEM:
BASARI_GOSTERGESI:
KALICILIK_KANITI:
HATA_DURUMU:
BOS_DURUM:
YENIDEN_ACMA_ADIMI:
```

Örnek:

```text
FEATURE_ID: WS-003-CUSTOMER-MATCHES
KULLANICI_ROLU: Admin
BASLANGIC_EKRANI: CRM hattı
GIRIS_NOKTASI: Müşteri kartı üst sekmeleri
GIRIS_NOKTASI_METNI: Eşleşmeler
HEDEF_EKRAN: Otomatik portföy eşleşmeleri
ANA_ISLEM: İlgilenilenlere ekle
BASARI_GOSTERGESI: Başarı bildirimi ve güncellenen liste
KALICILIK_KANITI: Kart kapatılıp yeniden açıldığında kayıt görünür
HATA_DURUMU: API/store hatası açık mesajla gösterilir
BOS_DURUM: Uygun eşleşme yok mesajı görünür
YENIDEN_ACMA_ADIMI: CRM → Müşteri kartı → Eşleşmeler
```

Bu sözleşme yoksa görünür özellik uygulamaya hazır sayılmaz.

---

## 4. Erişim noktası envanteri

Yeni veya değişen her görünür özellik için aşağıdaki kaynaklar kontrol edilir:

- Ana navigasyon
- Alt menü
- Sekme listesi
- Buton grubu
- Modal açma çağrısı
- Rota tanımı
- Rol/yetki koşulu
- Feature flag
- Mobil menü
- Boş durumdaki çağrı düğmesi
- Liste satırı aksiyonları
- Geri dönüş ve kapatma akışı

Ekran gövdesi ile erişim noktası ayrı ayrı doğrulanır.

Özellikle şu iki soru zorunludur:

```text
1. Bu ekranı kullanıcı hangi görünür kontrolle açacak?
2. O kontrol gerçekten render ediliyor ve tıklanabiliyor mu?
```

Bu sorulara kod ve çalışan uygulama kanıtı olmadan “evet” denmez.

---

## 5. Test kanıtı hiyerarşisi

Kanıt gücü aşağıdaki sıradadır:

```text
1. Gerçek tarayıcı kullanıcı akışı
2. Tarayıcı otomasyonu / E2E testi
3. Çalışan sunucuda HTTP + DOM doğrulaması
4. Component/integration testi
5. API testi
6. Unit testi
7. Typecheck / lint
8. Build
9. Yalnız kod incelemesi
```

Alt seviyedeki kanıt, üst seviyedeki kullanıcı akışının yerine geçmez.

Örneğin:

- API testi geçmesi, sekmenin görünür olduğunu kanıtlamaz.
- Build geçmesi, butonun doğru yere bağlandığını kanıtlamaz.
- Component kodunun bulunması, kullanıcının o bileşene ulaşabildiğini kanıtlamaz.

Tarayıcı aracı yoksa sonuç açıkça şöyle yazılır:

```text
GERCEK_TARAYICI_DOGRULAMASI: YAPILAMADI
NEDEN: Ortamda tarayıcı otomasyonu yok
SAHA_HUKMU: REVIEW_READY / USER_ACCEPTANCE_REQUIRED
```

Bu durumda “tam doğrulandı” veya “sorun yok” denmez.

---

## 6. Zorunlu uçtan uca test matrisi

Her görünür özellik en az şu senaryoları taşır:

### 6.1. Görünürlük
- Giriş noktası doğru rolde görünür.
- Yetkisiz rolde görünmez veya kapalıdır.
- Metin doğru ve anlaşılırdır.

### 6.2. Açılabilirlik
- Sekme, buton veya bağlantı tıklanır.
- Doğru ekran açılır.
- Yanlış ekran, boş modal veya sessiz hata oluşmaz.

### 6.3. İşlem
- Ana işlem tamamlanır.
- Loading durumu görünür.
- Çift tıklama veya tekrar gönderim güvenli davranır.

### 6.4. Sonuç
- Başarı mesajı görünür.
- Veri ekranda güncellenir.
- Kapatıp yeniden açınca sonuç korunur.

### 6.5. Negatif durum
- Boş veri
- Yetkisiz erişim
- API hatası
- Store/veri kaynağı hatası
- Eksik zorunlu alan
- Zaman aşımı
- Kullanıcı iptali

### 6.6. Regresyon
- Komşu sekmeler hâlâ açılır.
- Mevcut menüler kaybolmaz.
- Eski kayıtlar okunur.
- İlgili modaldaki diğer işlemler bozulmaz.

---

## 7. Bağlantısız ekran tespit kuralı

Aşağıdaki desenlerden biri bulunursa otomatik inceleme açılır:

- `tab === "..."` var fakat sekme tanımında karşılığı yok
- Modal içeriği var fakat `open/setOpen` çağrısı yok
- Sayfa/route var fakat menü veya yönlendirme yok
- İşlem fonksiyonu var fakat görünür buton bağlanmamış
- Feature flag özelliği sürekli kapalı bırakıyor
- Rol koşulu bütün gerçek kullanıcıları dışlıyor
- Buton render ediliyor fakat handler bağlı değil
- Handler var fakat hedef bileşen hiç render edilmiyor
- Masaüstünde giriş var, mobilde yok
- Liste satırı aksiyonu var fakat boş durumda erişim yolu yok

Bu bulgularda özellik otomatik olarak:

```text
UI_ORPHAN_RISK: OPEN
```

durumuna alınır ve gerçek akış doğrulanmadan kapanmaz.

---

## 8. Paketleme öncesi zorunlu kullanıcı yolculuğu testi

`PAKETLE` öncesinde her yeni görünür özellik için şu kayıt bulunmalıdır:

```text
USER_JOURNEY_ID:
TEST_EDEN:
BASLANGIC:
IZLENEN_ADIMLAR:
GORULEN_GIRIS_NOKTASI:
ACILAN_EKRAN:
YAPILAN_ISLEM:
SONUC:
KALICILIK:
NEGATIF_SENARYO:
KANIT_TURU:
HUKUM: PASS | FAIL | NOT_RUN
```

Aşağıdaki durumlardan biri varsa ZIP üretilemez:

- Giriş noktası test edilmemişse
- Özellik kullanıcı tarafından açılamıyorsa
- Ana işlem tamamlanamıyorsa
- Sonuç kalıcı değilse
- Test `NOT_RUN` olduğu hâlde raporda “tamamlandı” yazıyorsa
- API/unit/build sonucu gerçek kullanıcı testi gibi sunulmuşsa

---

## 9. Sonuç dili ve doğruluk kuralı

Test raporunda kullanılan ifadeler kanıt seviyesine uymalıdır.

### Kullanılabilir ifadeler

```text
Unit testleri geçti.
API akışı doğrulandı.
Production build geçti.
Çalışan sunucu yanıt verdi.
Tarayıcı kullanıcı akışı doğrulandı.
Tarayıcı testi yapılamadı; saha kabulü bekleniyor.
```

### Kanıt yokken kullanılamayacak ifadeler

```text
Sorun yok.
Tam çalışıyor.
Kullanıcı ekranında mevcut.
Eksiksiz tamamlandı.
Canlı kullanıma hazır.
Bütün akışlar test edildi.
```

Kesin hüküm yalnız ilgili kanıt mevcutsa verilir.

---

## 10. Reviewer zorunluluğu

Reviewer yalnız değişen iş mantığını değil, kullanıcıya açılan yolu da kontrol eder.

Reviewer şu sorulara ayrı cevap verir:

```text
1. Özellik kodda var mı?
2. Kullanıcı giriş noktası var mı?
3. Giriş noktası doğru ekranda görünür mü?
4. Tıklanınca hedef açılıyor mu?
5. Ana işlem tamamlanıyor mu?
6. Sonuç yeniden açıldığında korunuyor mu?
7. Negatif ve boş durumlar görünür mü?
```

Sorulardan biri kanıtsızsa:

```text
REVIEW_HUKMU: CHANGES_REQUESTED
```

olur.

---

## 11. Bu hatadan çıkarılan kalıcı ders

```text
LESSON_ID: LESSON-YGIS-003
KAYNAK_OLAY: Müşteri kartı Eşleşmeler sekmesinin eksik teslim edilmesi
HATA_DESENI: Ekran gövdesi ve API mevcuttu; görünür giriş noktası yoktu
KOK_NEDEN: Kod/API/build testlerinin gerçek kullanıcı erişilebilirliği yerine kabul edilmesi
GENELLENEBILIR_KURAL: Görünür özellik, kullanıcı giriş noktası ve uçtan uca yolculuk kanıtı olmadan tamamlanmış sayılamaz
EKLENECEK_KONTROL: UI erişilebilirlik ve giriş noktası envanteri
EKLENECEK_TEST: Başlangıç ekranı → giriş noktası → hedef ekran → ana işlem → kalıcılık E2E testi
DURUM: ACCEPTED
```

---

## 12. Nihai kapı

Bir görünür özellik için nihai kabul formülü:

```text
KOD
+ ERİŞİM NOKTASI
+ DOĞRU YETKİ
+ AÇILABİLİR EKRAN
+ TAMAMLANABİLİR İŞLEM
+ KALICI SONUÇ
+ NEGATİF DURUMLAR
+ GERÇEK KULLANICI AKIŞI KANITI
= FEATURE_ACCEPTED
```

Bu bileşenlerden biri eksikse:

```text
FEATURE_ACCEPTED: FALSE
RELEASE_HUKMU: CHANGES_REQUESTED
```
