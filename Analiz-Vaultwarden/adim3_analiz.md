### Adım 3: İş Akışları ve CI/CD Pipeline Analizi (.github/workflows)

Vaultwarden projesinde CI/CD süreçleri GitHub Actions kullanılarak yönetilmektedir. .github/workflows/build.yml gibi dosyalar incelendiğinde şu adımlar tespit edilmiştir:

1. **Derleme ve Test (Build & Test):** Kod her 'Push' edildiğinde Rust ortamı kurulur (cargo build) ve birim testleri (cargo test) otomatik olarak çalıştırılır. Bu, hatalı kodun üretim ortamına sızmasını engeller.
2. **Güvenlik Taraması (Security Scanning):** Docker imajları oluşturulurken zafiyet tarama araçları (Örn: Trivy) devreye girer. İmaj katmanlarında bilinen bir açık (CVE) varsa derleme iptal edilir.
3. **Otomatik Dağıtım (Deployment):** Testleri geçen kod, Docker Hub'a yeni bir imaj olarak itilir (Push).

**Kritik Soru: Webhook Nedir ve Rolü Nedir?**
Webhook, bir sistemde bir olay gerçekleştiğinde (Örn: Kodun güncellenmesi) başka bir sisteme gönderilen "anlık bildirim"dir. 
- **Proje Özelinde:** GitHub Actions bir derlemeyi bitirdiğinde, Docker Hub'a veya sunucumuza bir Webhook göndererek 'Yeni sürüm hazır, indir ve kur!' emrini verir. 
- **Genel Rolü:** Manuel müdahaleyi ortadan kaldırarak yazılımın yaşam döngüsünü (SDLC) otomatikleştirir.

**Siber Güvenlik Bakışı:** Yanlış yapılandırılmış bir Webhook, saldırganın sahte bir 'Build Başarılı' sinyali göndererek sisteme zararlı bir imaj yükletmesine (Supply Chain Attack) neden olabilir.
