# Sync .env variables to Vercel (Production, Preview, Development).
# Run from project root after filling .env:  npm run setup:vercel-env

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
  "SUPABASE_SERVICE_ROLE_KEY",
  "LOVABLE_API_KEY"
)

Get-Content ".env" | ForEach-Object {
  if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
  $parts = $_ -split '=', 2
  $name = $parts[0].Trim()
  if ($name -notin $keys) { return }
  $value = $parts[1].Trim().Trim('"').Trim("'")
  if (-not $value) { return }
  Write-Host "Syncing $name ..."
  $value | vercel env add $name production preview development --force
}

Write-Host "`nDone. Redeploy: vercel --prod"
