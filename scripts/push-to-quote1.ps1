# 將 dowaterlightout 的報得過程式推到 Quote1.0 main
# 用法（PowerShell）：
#   cd C:\Users\tr197\Desktop\Quote1.0
#   powershell -ExecutionPolicy Bypass -File scripts\push-to-quote1.ps1

$ErrorActionPreference = "Stop"

$SourceRepo = "https://github.com/AndyKao-commits/dowaterlightout.git"
$SourceBranch = "cursor/baodeguo-quote1-bd62"
$TargetRepo = "https://github.com/AndyKao-commits/Quote1.0.git"
$TargetBranch = "main"

Write-Host "=== 報得過 → Quote1.0 推送 ===" -ForegroundColor Cyan

if (-not (Test-Path ".git")) {
  Write-Host "請在 git 專案目錄執行（例如 clone 後的 dowaterlightout 資料夾）" -ForegroundColor Red
  exit 1
}

Write-Host "1. 拉取最新程式..." -ForegroundColor Yellow
git fetch origin $SourceBranch
git checkout $SourceBranch 2>$null
if ($LASTEXITCODE -ne 0) {
  git checkout -b $SourceBranch "origin/$SourceBranch"
}
git pull origin $SourceBranch

Write-Host "2. 設定 Quote1.0 remote..." -ForegroundColor Yellow
$remotes = git remote
if ($remotes -contains "quote1") {
  git remote set-url quote1 $TargetRepo
} else {
  git remote add quote1 $TargetRepo
}

Write-Host "3. 推到 Quote1.0 main（需 GitHub 登入）..." -ForegroundColor Yellow
git push quote1 "${SourceBranch}:${TargetBranch}"

Write-Host ""
Write-Host "完成！請到 Vercel 對 Quote1.0 專案按 Redeploy。" -ForegroundColor Green
Write-Host "Vercel 環境變數需有 SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor Green
