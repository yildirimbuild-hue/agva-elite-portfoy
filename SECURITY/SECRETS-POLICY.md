# Sırlar ve Ortam Değişkenleri Politikası

- Gerçek API anahtarı, parola, token veya sertifika kaynak pakete konmaz.
- `.env.local` Git ve teslim paketine dahil edilmez.
- `.env.example` yalnız değişken adlarını ve sahte örnekleri içerir.
- `ADMIN_PASSWORD` ve `ADMIN_SESSION_SECRET` production ortamında zorunlu güçlü değerlerdir.
- DeepSeek, ElevenLabs, GitHub ve Vercel Blob anahtarları yalnız sunucu ortamında tutulur.
- Loglar tam telefon, parola, cookie veya API anahtarı içermez.
- Demo admin fallback yalnız yerel test içindir; production release kontrolü zayıf varsayılanları reddetmelidir.
- Anahtar sızıntısında anahtar iptal edilir, rotate edilir ve olay audit kaydına yazılır.
