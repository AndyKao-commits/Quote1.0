# Wrapper — real logic in scripts/dev-local-lan.mjs
$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path ".env.local-first")) {
  Copy-Item "local-first.env.example" ".env.local-first"
}

node scripts/dev-local-lan.mjs
