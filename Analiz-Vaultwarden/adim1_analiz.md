### Adım 1: Kurulum ve install.sh Analizi (Reverse Engineering)

Vaultwarden projesi incelendiğinde, kurulumun genellikle Docker katmanları üzerinden yapıldığı görülmektedir. Ancak sistem kurulum scriptleri şu kritik noktaları içerir:

1. **Dizin Yapılandırması:** Kurulum sırasında /data dizini oluşturularak veritabanı (SQLite) ve RSA anahtarları izole edilir.
2. **Dış Paket Güvenliği:** Docker imajları çekilirken SHA256 imzaları kontrol edilmezse 'Image Poisoning' saldırılarına açıktır.
3. **Yetki Talebi:** Scriptler genellikle 'Root' yetkisi ister. Güvenlik açısından bu bir risktir; konteyner 'Non-privileged' modda çalıştırılmalıdır.

**Kritik Soru Yanıtı:** Vaultwarden kurulumu sırasında dışarıdan çekilen paketler Docker Hub üzerinden gelir. Güvenliği artırmak için 'Specific Tag' ve 'Digest' kullanımı şarttır.
