# 允許區網連入 8080、3099（需系統管理員）
#Requires -RunAsAdministrator

$rules = @(
  @{ Name = "BdgDev-Vite-8080"; Port = 8080 },
  @{ Name = "BdgDev-Mock-3099"; Port = 3099 }
)

foreach ($r in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "[skip] $($r.Name) 已存在" -ForegroundColor DarkGray
    continue
  }
  New-NetFirewallRule `
    -DisplayName $r.Name `
    -Direction Inbound `
    -LocalPort $r.Port `
    -Protocol TCP `
    -Action Allow `
    -Profile Private `
    | Out-Null
  Write-Host "[ok] 已允許私人網路 TCP $($r.Port)" -ForegroundColor Green
}

Write-Host ""
Write-Host "完成。請再執行 npm run lan:diagnose 確認。" -ForegroundColor Cyan
