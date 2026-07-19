# Handoff — İKİSU Emlak

## Geçerli durum

- Son doğrulanmış release: `0.1.0`
- Doğrulanmış release SHA-256: `97326260119885402106db79dcf10ea39ab359ef66dd51ae14879b22538c84af`
- Çalışma adayı: `0.2.0-rc.2`
- Workstream: `WS-003 — Portföy–Müşteri Eşleştirme`
- Durum: `REVIEW_READY`
- Paket türü: Kullanıcı talebiyle oluşturulan review-candidate snapshot; doğrulanmış release değildir.

## Görünür sonuç

- Müşteri 360 ekranında **Eşleşmeler** sekmesi bulunur.
- Portföy tablosunda **Eşleşmeler** düğmesi bulunur.
- Uyum puanı, veri kapsamı, nedenler ve bilgi eksikliği ayrı gösterilir.
- Önerilen portföy müşteri kartına eklenebilir.

## Reviewer düzeltmeleri

- Satıcı/Ev Sahibi/Belirsiz roller talep adayından çıkarıldı.
- İstenmeyen özellikte bilgi eksikliği kesin geçiş sayılmıyor.
- Olumsuz özellik cümleleri pozitif kanıt sayılmıyor.
- Yalnız kesin kriterli müşteriler görünür durumda tutuluyor.
- Eksik konum unknown sayılıyor.
- Villa yaşam alanında arsa büyüklüğü kullanılmıyor.

## Test

- TypeScript PASS
- Özellik/regresyon 20/20 PASS
- Veri doğrulama PASS
- Production build/start PASS
- Gerçek HTTP smoke PASS

## Kalan kapı

Ayrı reviewer `APPROVED` vermeden bu aday doğrulanmış release olarak adlandırılmamalıdır.
