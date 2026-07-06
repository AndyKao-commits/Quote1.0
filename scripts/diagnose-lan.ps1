# LAN connectivity diagnostic for mobile testing
$ErrorActionPreference = "Continue"

function Get-WifiLanIPv4 {
  $all = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' }
  foreach ($pattern in @('^192\.168\.', '^10\.', '^172\.(1[6-9]|2[0-9]|3[0-1])\.')) {
    $hit = $all | Where-Object { $_.IPAddress -match $pattern } | Select-Object -First 1
    if ($hit) { return $hit.IPAddress }
  }
  if ($all) { return ($all | Select-Object -First 1).IPAddress }
  return $null
}

$ip = Get-WifiLanIPv4
Write-Host ""
Write-Host "=== Bdg LAN diagnostic ===" -ForegroundColor Cyan
Write-Host ""

if (-not $ip) {
  Write-Host "[X] No Wi-Fi LAN IP found" -ForegroundColor Red
  exit 1
}

Write-Host "[i] Use this IP on phone: $ip" -ForegroundColor White
Write-Host "[i] Phone URL: http://${ip}:8080/auth" -ForegroundColor Green
Write-Host ""

function Test-Port($port) {
  $listen = netstat -ano | Select-String "0\.0\.0\.0:$port\s" -Quiet
  if ($listen) {
    Write-Host "[ok] Port $port listening on 0.0.0.0" -ForegroundColor Green
  } else {
    $local = netstat -ano | Select-String "127\.0\.0\.1:$port\s" -Quiet
    if ($local) {
      Write-Host "[!!] Port $port is localhost-only - phone cannot connect" -ForegroundColor Yellow
      if ($port -eq 3099) { Write-Host "     Run: npm run mock:api:lan" -ForegroundColor Yellow }
    } else {
      Write-Host "[X] Port $port not running" -ForegroundColor Red
    }
  }
}

Test-Port 8080
Test-Port 3099
Write-Host ""

try {
  $dev = Invoke-WebRequest -Uri "http://127.0.0.1:3099/health" -UseBasicParsing -TimeoutSec 2
  if ($dev.StatusCode -eq 200) {
    Write-Host "[i] Auth API is up. If phone login fails with device limit:" -ForegroundColor DarkGray
    Write-Host "    npm run lan:reset-devices" -ForegroundColor DarkGray
  }
} catch { }

Write-Host ""
$urls = @(
  "http://127.0.0.1:8080/",
  "http://${ip}:8080/",
  "http://127.0.0.1:8080/__local_auth__/health",
  "http://${ip}:8080/__local_auth__/health",
  "http://127.0.0.1:3099/health",
  "http://${ip}:3099/health"
)
foreach ($url in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
    Write-Host "[ok] $url status $($r.StatusCode)" -ForegroundColor Green
  } catch {
    Write-Host "[X] $url failed" -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "If http://${ip}:8080 fails, run as Administrator:" -ForegroundColor Cyan
Write-Host "  npm run lan:firewall" -ForegroundColor White
Write-Host ""
