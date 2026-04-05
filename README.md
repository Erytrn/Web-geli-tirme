# 🛡️ Advanced Cyber Security Lab: Ransomware & Vaultwarden Analysis

<p align="center">
  <img src="https://img.shields.io/github/languages/top/Erytrn/Web-geli-tirme?color=blue&style=for-the-badge" />
  <img src="https://img.shields.io/github/commit-activity/m/Erytrn/Web-geli-tirme?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Security-Hardened-green?style=for-the-badge" />
</p>

Bu proje, **Bahar 2026 Web Güvenliği** dersi kapsamında hazırlanan, hem **Red Team** (Saldırı) hem de **Blue Team** (Savunma) pratiklerini içeren kapsamlı bir laboratuvar çalışmasıdır.

---

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
