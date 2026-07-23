# Değişiklik Günlüğü

## [0.2.0-rc.3] — 2026-07-19 — REVIEW_READY

- Müşteri kartı üst menüsüne görünür **Eşleşmeler** sekmesi eklendi.
- Eşleşme sekmesinin yükleme durumunda sonsuza kadar kalmasına yol açan effect yarış koşulu düzeltildi.
- Uygunluk nedenleri dört maddeyle kesilmek yerine eksiksiz gösterilmeye başlandı.
- Bütçe, rol ve bilinmeyen özellik engellerinin açıklayıcı kriterleri ekranda görünür hâle getirildi.
- Portföy eşleşme modalından müşteri kartına geçiş tek sahipli ve temiz modal geçişine dönüştürüldü.
- `UI-REACHABILITY-AND-USER-FLOW-GATE.md` uygulama köküne eklendi.
- Erişim noktası ve modal bağlantısı için regresyon testleri eklendi.
- TypeScript PASS; 23/23 otomatik test PASS; production build/start PASS.
- Gerçek Chromium kullanıcı akışı 9/9 PASS.
- Sentetik müşteri, randevu, audit ve test verileri release adayından temizlendi.
- Kullanıcının bağımsız `PAKETLE` yetkisiyle `agva-elite-portfoy-v0.2.0-rc.3-review-candidate.zip` review candidate ZIP olarak hazırlandı.
- Bağımsız reviewer onayı bekleniyor; artefakt doğrulanmış release değildir.

## [0.2.0-rc.2] — 2026-07-18 — REVIEW_READY

- Çift yönlü portföy–müşteri eşleştirme eklendi.
- Açıklanabilir puan, coverage ve bilgi yetersizliği gösterimi eklendi.
- Satıcı/Ev Sahibi/Belirsiz rol yönü düzeltildi.
- Bilinmeyen istenmeyen özellik kesin geçiş sayılmıyor.
- “Havuz yok” gibi olumsuz ifadeler pozitif özellik sayılmıyor.
- Yalnız kesin kriterli profiller görünür tutuluyor.
- Eksik konum unknown sayılıyor; villa alanında arsa alanı kullanılmıyor.
- 20/20 test, production build/start ve gerçek HTTP smoke PASS.
- Bağımsız reviewer onayı bekleniyor.

## [0.1.0] — 2026-07-18

### Mevcut ürün baseline'ı

- İlan kataloğu ve 24 örnek portföy
- İlan bağlamlı yapay zekâ danışmanı
- Şifreli admin paneli ve ilan yönetimi
- CRM hattı ve ilan/SEO yazarı
- Paket 1 randevu sistemi
- Paket 2 Tam Müşteri Kartı

### YGİS bootstrap

- `VERSION`, `PROJECT-STATE.json`, kimlik, baseline, mimari, yol haritası ve handoff kayıtları eklendi.
- S2 kontrol dosyaları ve regresyon/test matrisi hazırlandı.
- `.ai-control` çoklu yapay zekâ koordinasyon alanı eklendi.
- Çalışma modu doğrulanabilir ortak depo bulunmadığı için `PROJECT_CONTEXT_ONLY` olarak kaydedildi.

### Doğrulama

- TypeScript: PASS
- Özellik testleri: 13/13 PASS
- Production build: PASS
- Temel HTTP smoke: PASS; `/api/health` üretim değişkenleri olmadığı için beklenen `configuration_required` sonucunu verdi.

## Release kaydı — 2026-07-18

- YGİS bootstrap workstream'i `WS-B0-BOOTSTRAP` olarak RELEASED durumuna getirildi.
- Kullanıcı `PAKETLE` yetkisi kaydedildi.
- Temiz release ZIP'i ve dış SHA-256 kaydı üretildi.
