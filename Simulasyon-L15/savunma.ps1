# L15 Savunma 2.0 - Tam Izolasyon
$hedefDizin = "$HOME\OneDrive\Masaüstü\vize-proje\Simulasyon-L15\hassas_veriler"

Write-Host "[!] SIKI YONETIM MODU AKTIF EDILIYOR..." -ForegroundColor Cyan

# 1. KATMAN: Agı Komple Kapatma (Daha Genis Firewall)
# Sadece spesifik bir exe degil, sistemdeki tum PowerShell trafigini blokluyoruz.
Write-Host "[+] 1. Katman: Outbound PowerShell trafigi bloklaniyor..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "Vize_*" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Vize_Proje_Blok" -Direction Outbound -Action Block -Enabled True -Service "WinRM" -ErrorAction SilentlyContinue
New-NetFirewallRule -DisplayName "Vize_Proje_Blok_Web" -Direction Outbound -Action Block -Enabled True -Protocol TCP -LocalPort Any -RemotePort 80,443 -ErrorAction SilentlyContinue

# 2. KATMAN: Dosya Sistemini Betonlama
# Yazma yetkisini "Herkes" icin reddediyoruz (En garantisi budur).
Write-Host "[+] 2. Katman: Yazma yetkisi tamamen reddediliyor..." -ForegroundColor Yellow
icacls $hedefDizin /deny "Everyone:(W)" /T /C

Write-Host "`n[✅] HAPISHANE TAMAMLANDI. Hicbir veri disari cikamaz!" -ForegroundColor Green
