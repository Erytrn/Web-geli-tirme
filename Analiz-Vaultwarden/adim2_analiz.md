### Adım 2: İzolasyon ve İz Bırakmadan Temizlik (Forensics & Cleanup)

Vaultwarden gibi Docker tabanlı sistemlerde "temizlik" sadece dosyaları silmek değildir. Gerçek bir temizlik ispatı için şu adımlar izlenmiştir:

1. **Konteyner ve İmaj Temizliği:**
   docker-compose down -v komutu ile sadece konteynerler değil, veri hacimleri (volumes) de kaldırılarak kalıcı veriler yok edilir. docker rmi ile sistemde sahipsiz (dangling) imaj bırakılmadığı doğrulanır.

2. **Ağ İzlerinin Silinmesi:**
   Uygulamanın kullandığı portlar (Örn: 8080) 
etstat -ano veya ss -tunlp komutları ile kontrol edilerek, uygulamanın kapanmasına rağmen portu "dinlemeye" (listening) devam eden gizli bir servis kalmadığı kanıtlanır.

3. **Log Analizi (Artifact Hunting):**
   /var/log/syslog veya Docker'ın kendi log dizinleri taranarak, uygulamanın sistem genelinde bıraktığı izler (kurulum logları, hata kayıtları) tespit edilir ve manuel olarak temizlenir.

**Kritik Soru Yanıtı:** Bir sistemin %100 temiz olduğundan emin olmanın yolu, kurulum öncesi ve sonrası 'Sistem Snapshot (Diff)' karşılaştırması yapmaktır. Bu projede sanal makine (VM) kullanılarak, temizlik sonrası başlangıç snapshot'ına dönülmüş ve sistem bütünlüğü (integrity) korunmuştur.
