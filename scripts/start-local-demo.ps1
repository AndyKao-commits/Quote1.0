# 一鍵啟動本機離線模擬（Windows）
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host ""
Write-Host "=== 報得過 · 本機執行 ===" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path ".env.local-first")) {
  Copy-Item "local-first.env.example" ".env.local-first"
  Write-Host "[ok] 已建立 .env.local-first" -ForegroundColor Green
}

$mockPort = 3099
try {
  $null = Invoke-WebRequest -Uri "http://127.0.0.1:$mockPort/health" -UseBasicParsing -TimeoutSec 2
  Write-Host "[ok] 授權服務已在執行 (port $mockPort)" -ForegroundColor Green
} catch {
  Write-Host "[..] 正在新視窗啟動授權服務 (port $mockPort)..." -ForegroundColor Yellow
  Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$root'; Write-Host '授權服務 — 請保持此視窗開啟' -ForegroundColor Cyan; npm run mock:api"
  )
  Start-Sleep -Seconds 2
  try {
    $null = Invoke-WebRequest -Uri "http://127.0.0.1:$mockPort/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "[ok] 授權服務已就緒" -ForegroundColor Green
  } catch {
    Write-Host "[!!] 授權服務啟動失敗。請手動執行: npm run mock:api" -ForegroundColor Red
    exit 1
  }
}

Write-Host ""
Write-Host "啟動前端後請開啟:" -ForegroundColor Cyan
Write-Host "  http://localhost:8080/auth" -ForegroundColor White
Write-Host ""

npm run dev:local
