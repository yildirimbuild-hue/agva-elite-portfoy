# WS-004 — Uçtan Uca Ziyaretçi Favorileri

OWNER: AI-DEV-02
REVIEWER: AI-REVIEW-01
BASE: 0.2.0-rc.3+workspace-approved-2026-07-23 / 7feb9dae51873fa1ab8f1ed875c6c1b9641be820c179bdb2be8ab7714972ef3f

## Amaç

Ziyaretçinin ilanı detay veya katalog kartından aynı tarayıcıya kalıcı biçimde kaydedebilmesi, görünür favori sayacından yalnız kaydettiği yayındaki ilanlara ulaşabilmesi ve listeyi yönetebilmesi.

## Kabul kriterleri

- Detay ve katalog kontrolleri mevcut favori durumunu görünür ve erişilebilir biçimde gösterir.
- Her iki yüzeyde ilk tıklama ilanı ekler; ikinci tıklama çıkarır.
- Favorilerim sayacı yalnız halen yayındaki kaydedilmiş ilanları gösterir.
- Favorilerim görünümü kaydedilmiş ilanları filtreler, detay bağlantılarını korur ve boş durumda tüm ilanlara dönüş verir.
- Durum sayfa yenilemesinden ve aynı tarayıcıdaki sekmeler arası güncellemeden sonra korunur.
- Bozuk veya erişilemeyen tarayıcı depolaması sayfayı kırmaz.
- Mevcut ilan detay, filtre, randevu ve iletişim davranışları korunur.
