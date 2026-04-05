# 🛡️ Siber Güvenlik Vize Projesi - Eray Turan

Bu repository, Web Güvenliği dersi kapsamında hazırlanan iki aşamalı güvenlik projesini içermektedir.

## ☣️ Faz 2: Ransomware Sandbox (L15) - ANALİZ RAPORU
Simülasyon başarıyla tamamlanmıştır. Yapılan testlerde şu sonuçlar elde edilmiştir:

1. **Saldırı Başarısı:** Savunma katmanları kapalıyken, taker.ps1 verileri AES-256 ile şifrelemiş ve anahtarı Webhook'a sızdırmıştır.
2. **Savunma Başarısı:** savunma.ps1 çalıştırıldıktan sonra:
   - **Network Block:** Firewall kuralları Outbound trafiği kesmiş, anahtarın sızması (Exfiltration) engellenmiştir.
   - **File System Lock:** Yetki kısıtlaması ile ransomware'in dosyalara erişimi (Write/Delete) bloke edilmiştir.
   - **Sonuç:** Kırmızı hata çıktıları, sistemin tam izolasyon (Sandbox) altında olduğunu kanıtlamaktadır.

## 🏗️ Faz 1: Vaultwarden Mimari Analizi (Devam Ediyor...)
