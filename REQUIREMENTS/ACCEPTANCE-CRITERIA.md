# Kabul Kriterleri — 0.2.0-rc.2

## Paket 3 — Portföy–Müşteri Eşleştirme

- Müşteri kartı yayındaki portföyleri otomatik sıralar.
- Portföy ekranı aktif müşterileri ters yönde sıralar.
- Yalnız `Alıcı` ve `Kiracı` talep yönüne alınır; `Satıcı`, `Ev Sahibi` ve `Belirsiz` profiller öneri adayı değildir.
- Bütçe, işlem türü, minimum oda/alan, vazgeçilmez ve istenmeyen özellikler kesin uygunluk kapısıdır.
- Bölge, gayrimenkul türü ve tercih edilen özellikler açıklanabilir sıralama kriteridir.
- Eksik veri sıfır veya olumsuz kanıt sayılmaz; coverage ayrı hesaplanır.
- Coverage %60 altındaysa veya kesin kriter doğrulanamıyorsa puan gösterilmez.
- `Havuz yok` gibi olumsuz cümleler pozitif özellik sayılmaz.
- Villa yaşam alanında arsa büyüklüğü iç alan yerine kullanılmaz.
- Yalnız kesin kriterleri bulunan müşteri sonuçlarda görünür; puanı `—` olarak gösterilir.
- Aynı girdi aynı sıralamayı üretir.
- Eşleştirme API'si yalnız admin oturumunda çalışır.
- Müşteri verisi kamu sayfalarına taşınmaz.
- Fiziksel migration yoktur; mevcut kayıtlar korunur.
