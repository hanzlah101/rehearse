# Installs Rehearse on Windows:
#   irm __SITE__/install.ps1 | iex
#
# Served by src/routes/install[.]ps1.ts, which fills in the site address. The
# installer comes from the site's /download/windows route
# (src/lib/downloads.ts), the latest GitHub Release.
#
# The installer isn't code-signed yet, so one downloaded in a browser gets
# SmartScreen's "Windows protected your PC". SmartScreen only checks files
# marked as downloaded from the internet; this one is unmarked, so it runs
# straight away.

$ErrorActionPreference = 'Stop'
# Windows PowerShell 5.1 downloads far slower while drawing progress.
$ProgressPreference = 'SilentlyContinue'

$installer = Join-Path $env:TEMP 'Rehearse-setup.exe'

Write-Host 'Downloading Rehearse...'
try {
  Invoke-WebRequest -Uri '__SITE__/download/windows' -OutFile $installer -UseBasicParsing
} catch {
  Write-Host "Couldn't download Rehearse. Check your connection and try again." -ForegroundColor Red
  return
}
Unblock-File -Path $installer

Write-Host 'Opening the installer...'
Start-Process -FilePath $installer -Wait
Remove-Item -Path $installer -Force -ErrorAction SilentlyContinue
