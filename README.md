# 🛡️ Advanced Cyber Security Lab: Ransomware & Vaultwarden Analysis

<p align="center">
  <img src="https://img.shields.io/github/languages/top/Erytrn/Web-geli-tirme?color=blue&style=for-the-badge" />
  <img src="https://img.shields.io/github/commit-activity/m/Erytrn/Web-geli-tirme?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Security-Hardened-green?style=for-the-badge" />
</p>

Bu proje, **Bahar 2026 Web Güvenliği** dersi kapsamında hazırlanan, hem **Red Team** (Saldırı) hem de **Blue Team** (Savunma) pratiklerini içeren kapsamlı bir laboratuvar çalışmasıdır.

---

## İçindekiler
- [Proje Yapısı](#proje-yapısı)
- [Dokümantasyon Detayları](#dokümantasyon-detayları)
- [Akademik Bilgiler](#akademik-bilgiler)
- [Video Demo](#video-demo)

## 📂 Proje Yapısı (Directory Tree)
```text
vize-proje/
├── .github/workflows/        # CI/CD Güvenlik Taraması (DevSecOps)
├── Analiz-Vaultwarden/       # 6 Aşamalı Derinlemesine Mimari Analiz
│   ├── adim1_analiz.md       # Kurulum ve install.sh Analizi
│   ├── adim2_analiz.md       # Forensics ve Temizlik
│   ├── adim3_analiz.md       # CI/CD & Webhook Analizi
│   ├── adim4_analiz.md       # Docker & Konteyner Güvenliği
│   ├── adim5_analiz.md       # Veritabanı & Şifreleme (RSA/AES)
│   └── adim6_linux_karsilastirma.md # Ubuntu vs Windows Analizi
├── docs/                     # Mimari Şemalar ve Teknik Dökümanlar
├── scripts/                  # L15 Ransomware & Sandbox Araçları
│   ├── ataker.ps1            # AES-256 Şifreleme Scripti
│   └── savunma.ps1           # Firewall & İzolasyon Scripti
└── README.md                 # Proje Ana Raporu
```

## Dokümantasyon Detayları

Bu sistem, web ve sistem güvenliği pratiklerini en uç noktada bir araya getirmek üzere tasarlanmıştır. Ransomware analizleri ile saldırı simülasyonları gerçekleştirilirken, aynı zamanda Vaultwarden mimarisi ile kurum içi veri güvenliğinin nasıl sağlanabileceği test edilmiştir. Projenin her iki tarafı da kapsamlı bir olay müdahale (incident response) senaryosu etrafında kurgulanmıştır. Söz konusu senaryolar, gerçek dünya örnekleme modeline dayanarak modern kurumsal ağlardaki zaafiyetlerin ve zayıf halkaların tespitine odaklanmaktadır. Sistem üzerindeki denemelerimiz, farklı servislerin manipüle edilebilir alanlarını belirlemek ve bunu sağlam bir şekilde güvenlik duvarları ve izolasyon teknikleri ile savunmak için oluşturulmuştur.
Analiz süreçlerinde elde edilen metrikler, sistemin stabilite ve güvenlik açısından çok yönlü olarak incelendiğini açıkça ortaya koymaktadır. 

Makine ve konteyner bazlı işlemler Docker ortamlarında izole olarak yürütülerek her aşamanın güvenli alanda gerçekleşmesi güvence altına alınmıştır. Sistemin kendi kendini onaran, hataları raporlayan ve ağ üzerinden oluşacak muhtemel ihlallerde erken uyarı veren bir yapıya sahip olması hedeflenmiştir. Tüm bileşenlerin derinlemesine entegrasyonu başarıyla sağlanmıştır. Olay müdahale süreçlerinde proaktif olarak çalışmak siber güvenlikte temel taşı niteliğinde olduğundan ötürü altyapılar devsecops süreçlerine uygun optimize edilmiştir. CI/CD testlerinin de entegrasyonu sayesinde kod kalitesi bir üst seviyeye çıkartılmıştır. 

## Akademik Bilgiler
Danışman: Prof. Dr. Keyvan Arasteh  
Kurum: İstinye Üniversitesi ![İstinye Yarı Saydam](https://istinye.edu.tr/favicon.ico)

## Video Demo
Aşağıdaki bağlantıdan projemizin detaylı demo kaydına ve bulguların görsel sunumuna ulaşabilirsiniz:
[Proje Analizi Demo Video](https://www.youtube.com/watch?v=dQw4w9WgXcQ)
🎬 Demo
