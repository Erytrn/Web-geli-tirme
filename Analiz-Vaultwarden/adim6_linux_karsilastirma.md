### Adım 6: İşletim Sistemi Güvenlik Karşılaştırması (Ubuntu vs Windows)

Proje kapsamında hem Windows PowerShell hem de Ubuntu (Linux) üzerinde yapılan testler sonucunda şu siber güvenlik çıkarımları yapılmıştır:

1. **Firewall Dinamikleri:** - **Windows:** 'New-NetFirewallRule' ile karmaşık objeler üzerinden kural yazılır. 
   - **Linux (Ubuntu):** 'iptables' veya 'nftables' ile doğrudan paket seviyesinde, daha hızlı ve daha keskin engelleme yapılır.

2. **Konteynerizasyon (Docker):** - Vaultwarden'ın asıl evi Ubuntu'dur. Linux çekirdeğinin (Kernel) sunduğu 'Namespaces' ve 'Cgroups' özellikleri, Windows'un sanallaştırma katmanından çok daha derin bir izolasyon sağlar.

3. **Dosya İzinleri:** - Windows 'icacls' ile karmaşık kullanıcı grupları yönetirken; Ubuntu 'chmod' ve 'chown' ile 777/644 gibi sayısal değerlerle hızlı ve net yetkilendirme sağlar.

**Sonuç:** Bu proje her iki platformda da test edilmiştir. Ubuntu, sunucu tarafındaki Vaultwarden mimarisi için 'Minimum Saldırı Yüzeyi' sunarken; Windows PowerShell, istemci tarafındaki (Client-side) ransomware tehditlerini durdurmak için daha esnek bir 'Scripting' ortamı sağlamaktadır.
