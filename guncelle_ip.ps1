$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -like "*Wi-Fi*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress

if (-not $ip) {
    $ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.*" } | Select-Object -First 1).IPAddress
}

if (-not $ip) {
    Write-Host "IP bulunamadi!" -ForegroundColor Red
    exit 1
}

Write-Host "Yeni IP: $ip" -ForegroundColor Cyan

$configPath = "C:\Users\yigit\Desktop\smart_plant\SmartAgriculture-Smart-Plant-Monitoring-and-Disease-Detection-System-main\mobile\src\config\api.config.js"
$configContent = "export const API_BASE_URL = 'http://" + $ip + ":8000';"
Set-Content -Path $configPath -Value $configContent -Encoding UTF8
Write-Host "api.config.js guncellendi" -ForegroundColor Green

$inoPath = "C:\Users\yigit\Desktop\smart_plant\SmartAgriculture-Smart-Plant-Monitoring-and-Disease-Detection-System-main\esp32_firmware\esp32_firmware.ino"
$ino = Get-Content $inoPath -Raw
$ino = $ino -replace 'const char\* SERVER_URL = "http://[^"]+";', ('const char* SERVER_URL = "http://' + $ip + ':8000/api/sensor";')
Set-Content -Path $inoPath -Value $ino -Encoding UTF8
Write-Host "esp32_firmware.ino guncellendi" -ForegroundColor Green

# Backend'i durdur
$pids2 = (netstat -ano | Select-String ":8000 .*LISTENING") -replace '.*\s+(\d+)$','$1' | Select-Object -Unique
foreach ($p in $pids2) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1

# Uvicorn ile baslat
$uvicorn = "C:\Users\yigit\AppData\Local\Programs\Python\Python310\Scripts\uvicorn.exe"
$backendPath = "C:\Users\yigit\Desktop\smart_plant\SmartAgriculture-Smart-Plant-Monitoring-and-Disease-Detection-System-main"
Start-Process -FilePath $uvicorn -ArgumentList "main:app --host 0.0.0.0 --port 8000" -WorkingDirectory $backendPath -WindowStyle Normal
Write-Host "Backend baslatildi (uvicorn)" -ForegroundColor Green

Write-Host ""
Write-Host ("Backend: http://" + $ip + ":8000") -ForegroundColor White
Write-Host "ESP32 firmware'i Arduino IDE'den tekrar yukle!" -ForegroundColor Yellow
Write-Host "Expo penceresinde r tusuna bas." -ForegroundColor Yellow
