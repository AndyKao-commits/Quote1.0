# Apply local SQL migrations to your linked Supabase project.
# Prerequisites: npx supabase login  &&  npx supabase link --project-ref ghswnxywwapsjicxteun

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Pushing migrations to Supabase project ghswnxywwapsjicxteun ..."
npx supabase db push
Write-Host "Done."
