# Teknik Borç Sicili

## TD-001 — Yerel JSON eşzamanlı yazma

- **Risk:** Çoklu kullanıcıda çakışma ve veri kaybı
- **Geçici önlem:** Tek yazarlı demo kullanımı veya GitHub adaptörü
- **Kalıcı çözüm:** PostgreSQL/Supabase ve transaction/unique constraints
- **Öncelik:** Yüksek — production öncesi

## TD-002 — Büyük AdminPanel bileşeni

- **Risk:** Paralel geliştirmede dosya çakışması ve bakım zorluğu
- **Kalıcı çözüm:** CRM, randevu, eşleştirme ve rapor panellerini modüler bileşenlere ayırmak
- **Öncelik:** Paket 3 öncesi/ile birlikte değerlendirilir

## TD-003 — Görsel E2E otomasyonu

- **Risk:** UI entegrasyon hataları HTTP/build testlerinde kaçabilir
- **Kalıcı çözüm:** Playwright/Cypress staging pipeline
- **Öncelik:** Orta

## TD-004 — Demo auth fallback

- **Risk:** Production ortamında varsayılan parola kullanımı
- **Kalıcı çözüm:** Deployment gate ve gerçek kullanıcı/rol sistemi
- **Öncelik:** Yüksek — production öncesi
