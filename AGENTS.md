# Yasin Codex çalışma protokolü

- Önce gerçek amacı ve test edilebilir kabul kriterlerini çıkar.
- İlgili dosyaları ve gerçek test komutlarını oku.
- Hata düzeltmesinde önce hatayı yeniden üret; yeni davranışta önce başarısız kabul testi yaz.
- Geçmiş benzer hataları ve önleyici kontrolleri dikkate al.
- En küçük hedefli değişikliği yap.
- Gerçek testleri çalıştır; kırmızı sonucu saklama.
- Bitirmeden diff, güvenlik, hata yolu ve kapsam dışı değişiklik öz-incelemesi yap.
- `.env` ve sırları okuma; kullanıcı istemeden commit, push, deploy, bağımlılık ekleme veya dosya silme yapma.
- `data/` altındaki JSON şemalarını değiştirme.
- Kendi çalışmana APPROVED verme; kanıtlı sonucu REVIEW_READY olarak bırak.
