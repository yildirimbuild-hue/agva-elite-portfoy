# Migration Politikası

Mevcut bootstrap turunda veri şeması veya uygulama verisi değiştirilmemiştir.

Gelecek migration'lar:

1. Benzersiz migration kimliği taşır.
2. Çalıştırılmadan önce veri yedeği alınır.
3. Tekrar çalıştırıldığında kayıt çoğaltmaz.
4. Önce/sonra kayıt sayısı ve örnek kayıt doğrulaması yapılır.
5. Rollback veya telafi migration'ı belgelenir.
6. Aynı veri şemasını iki workstream paralel değiştiremez.
