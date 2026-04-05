### Adım 4: Docker Mimarisi ve Konteyner Güvenliği

Vaultwarden'ın Docker üzerinde çalışması, "Micro-segmentation" prensibine dayanır. Mimari analiz sonucunda şu güvenlik katmanları tespit edilmiştir:

1. **İzolasyon (Namespace):** Konteyner, ana işletim sisteminin (Host) süreçlerinden (PID) ve dosya sisteminden izole edilmiştir. Bir saldırgan Vaultwarden'ı ele geçirse bile, konteyner dışına çıkması (Container Escape) oldukça zordur.
2. **Resource Limiting:** Docker üzerinden CPU ve RAM kısıtlaması yapılarak, uygulamanın bir zafiyet sonucu tüm sistem kaynaklarını tüketmesi (DoS saldırısı) engellenir.
3. **VM vs Konteyner Farkı:** Sanal makineler (VM) tam bir işletim sistemi çekirdeği (Kernel) taşırken, Docker ana makinenin çekirdeğini kullanır. Bu, Vaultwarden'ın çok daha hızlı ve hafif çalışmasını sağlar ancak çekirdek seviyesindeki bir zafiyet tüm konteynerleri etkileyebilir.

**Kritik Soru Yanıtı:** Vaultwarden imajları 'Alpine Linux' tabanlıdır. Bu, saldırı yüzeyini (Attack Surface) minimuma indirir çünkü içinde gereksiz hiçbir araç (Örn: SSH, curl, gereksiz kütüphaneler) barındırmaz.
