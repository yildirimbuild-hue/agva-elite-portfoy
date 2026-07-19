# ADR-0001 — Veri Deposu ve Çoklu AI Çalışma Modu

- **Durum:** Kabul edildi
- **Tarih:** 2026-07-18

## Bağlam

Uygulama demo/yerel kullanımda JSON dosyalarıyla çalışıyor; ilan ve bazı operasyon verileri için GitHub Contents adaptörü bulunuyor. ChatGPT Projesi dosya ve sohbet bağlamını paylaşsa da ortak yazılabilir repository doğrulanmış değil.

## Karar

1. Mevcut Paket 2 baseline'ında JSON ve GitHub adaptörleri korunur.
2. Çoklu eşzamanlı production kullanımına geçmeden PostgreSQL/Supabase migration planı hazırlanır.
3. Şimdiki çoklu AI modu `PROJECT_CONTEXT_ONLY` olarak kaydedilir.
4. Bu modda yalnız bir kanonik yazar kodu değiştirir; diğer ajanlar review, test ve patch önerisi üretir.
5. Ortak yazılabilir Git repository/worktree kanıtlandığında `SHARED_WRITABLE_WORKSPACE` moduna ayrı ADR ile geçilir.

## Sonuçlar

- ZIP çatallanması ve aynı dosyaya paralel kontrolsüz yazım engellenir.
- Gerçek paralel kodlama şimdilik kapalıdır.
- Üretim veri katmanı migration gereksinimi teknik borç olarak izlenir.
