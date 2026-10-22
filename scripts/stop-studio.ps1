$ErrorActionPreference = 'Stop'
$studioRoot = Split-Path -Parent $PSScriptRoot
$studioPidFile = Join-Path $studioRoot '.studio-runtime\server.pid'
if (-not (Test-Path -LiteralPath $studioPidFile)) { Write-Host 'No server started by the launcher was found.'; exit 0 }
$studioProcessId = [int](Get-Content -LiteralPath $studioPidFile)
$studioProcess = Get-CimInstance Win32_Process -Filter "ProcessId = $studioProcessId"
if ($studioProcess) {
    $studioCommand = [string]$studioProcess.CommandLine
    $studioVitePath = Join-Path $studioRoot 'node_modules\vite\bin\vite.js'
    if ($studioProcess.Name -ne 'node.exe' -or $studioCommand.IndexOf($studioVitePath, [StringComparison]::OrdinalIgnoreCase) -lt 0 -or $studioCommand -notmatch '--host.*127\.0\.0\.1.*--port.*5173.*--strictPort') { throw 'The PID no longer belongs to Studio. No other process will be stopped.' }
    Stop-Process -Id $studioProcessId -ErrorAction Stop
}
Remove-Item -LiteralPath $studioPidFile -Force
Write-Host 'Studio server stopped.'
