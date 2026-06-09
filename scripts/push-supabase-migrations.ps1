# Apply local SQL migrations to your linked Supabase project.
# Prerequisites: npx supabase login  &&  npx supabase link --project-ref YOUR_PROJECT_REF

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Pushing migrations to linked Supabase project ..."
npx supabase db push
Write-Host "Done."
