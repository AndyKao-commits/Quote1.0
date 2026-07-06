# Clear registered devices for demo@local (2-device limit blocks new phones)
$ErrorActionPreference = "Stop"
$body = '{"email":"demo@local"}'
try {
  $r = Invoke-WebRequest -Uri "http://127.0.0.1:3099/auth/clear-devices" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
  Write-Host "[ok] $($r.Content)" -ForegroundColor Green
} catch {
  Write-Host "[!!] 請先執行 npm run mock:api:lan" -ForegroundColor Red
  exit 1
}
