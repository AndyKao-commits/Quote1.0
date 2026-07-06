# Sync .env variables to Vercel (production, preview, development).
# Run: npm run setup:vercel-env

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path ".env")) {
  Write-Error "Missing .env — copy .env.example and add your Supabase keys first."
}

$keys = @(
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
  "SUPABASE_URL",
  "SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_SERVICE_ROLE_KEY"
)

$targets = @("production", "preview", "development")

Get-Content ".env" | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $parts = $_ -split '=', 2
  $name = $parts[0].Trim()
  if ($name -notin $keys) { return }
  $value = $parts[1].Trim().Trim('"').Trim("'")
  if (-not $value) { return }
  foreach ($target in $targets) {
    Write-Host "Syncing $name ($target) ..."
    vercel env add $name $target --value $value --force --yes --no-sensitive 2>&1 | Out-Null
  }
}

Write-Host "`nDone. Redeploy: vercel --prod"
