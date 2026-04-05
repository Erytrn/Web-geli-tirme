### Adım 5: Veritabanı Mimarisi ve Şifreleme (SQLite & RSA)

Vaultwarden'ın veri saklama mantığı 'Zero-Knowledge' (Sıfır Bilgi) prensibine dayanır. Mimari inceleme sonucu şu veriler elde edilmiştir:

1. **Veritabanı Seçimi (SQLite):** Vaultwarden, hafifliği ve taşınabilirliği nedeniyle varsayılan olarak SQLite kullanır. Tüm veriler 'db.sqlite3' dosyasında saklanır. 
2. **Uçtan Uca Şifreleme (E2EE):** Şifreler sunucuya asla 'açık metin' (plain-text) olarak gitmez. Şifreleme işlemi kullanıcının cihazında (Client-side) Master Password kullanılarak PBKDF2 algoritması ile yapılır.
3. **RSA ve AES İş Birliği:** Veritabanında saklanan veriler AES-256 ile şifrelenir. Cihazlar arası güvenli anahtar değişimi için ise RSA-2048/4096 anahtar çiftleri kullanılır.

**Kritik Soru Yanıtı:** Bir saldırgan 'db.sqlite3' dosyasını ele geçirse bile içindeki verileri okuyamaz. Çünkü çözme anahtarı (Decryption Key) sunucuda değil, sadece kullanıcının hafızasındaki Master Password'den türetilir. 

**Sonuç:** Vaultwarden mimarisi, sunucu tarafındaki bir sızıntının (Data Breach) kullanıcı verilerini ifşa etmesini imkansız kılacak şekilde tasarlanmıştır.
