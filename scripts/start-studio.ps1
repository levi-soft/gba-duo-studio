param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$studioRoot = Split-Path -Parent $PSScriptRoot
$studioUrl = 'http://127.0.0.1:5173/'
Set-Location -LiteralPath $studioRoot
try {
    $studioNode = (Get-Command node.exe -ErrorAction Stop).Source
    $studioNpm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $studioVersion = (& $studioNode --version).TrimStart('v').Split('.')
    if ([int]$studioVersion[0] -lt 22 -or ([int]$studioVersion[0] -eq 22 -and [int]$studioVersion[1] -lt 17)) {
        throw 'Node.js 22.17 or newer is required. Install a supported Node.js LTS version first.'
    }
    $studioExisting = $null
    try { $studioExisting = Invoke-WebRequest -Uri $studioUrl -UseBasicParsing -TimeoutSec 2 } catch {}
    if ($studioExisting) {
        if ($studioExisting.Content -notmatch 'GBA Duo Studio') { throw 'Port 5173 is in use by another application. Studio will not stop it.' }
        Write-Host "Studio is running: $studioUrl"
        if (-not $NoBrowser) { Start-Process $studioUrl }
        exit 0
    }
    if (-not (Test-Path -LiteralPath (Join-Path $studioRoot 'node_modules\vite\bin\vite.js'))) {
        Write-Host 'Installing project dependencies (first run only)...'
        & $studioNpm ci
        if ($LASTEXITCODE -ne 0) { throw 'npm ci failed. Check your connection and try again.' }
    }
    $studioRuntime = Join-Path $studioRoot '.studio-runtime'
    New-Item -ItemType Directory -Path $studioRuntime -Force | Out-Null
    $studioVitePath = Join-Path $studioRoot 'node_modules\vite\bin\vite.js'
    $studioProcess = Start-Process -FilePath $studioNode -ArgumentList @(('"' + $studioVitePath + '"'), '--host', '127.0.0.1', '--port', '5173', '--strictPort') -WorkingDirectory $studioRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $studioRuntime 'server.log') -RedirectStandardError (Join-Path $studioRuntime 'server-error.log') -PassThru
    Set-Content -LiteralPath (Join-Path $studioRuntime 'server.pid') -Value $studioProcess.Id -Encoding ASCII
    $studioReady = $false
    for ($studioAttempt = 0; $studioAttempt -lt 40; $studioAttempt++) {
        if ($studioProcess.HasExited) { throw 'The server stopped unexpectedly. See .studio-runtime\server-error.log.' }
        try {
            $studioResponse = Invoke-WebRequest -Uri $studioUrl -UseBasicParsing -TimeoutSec 2
            if ($studioResponse.Content -match 'GBA Duo Studio') { $studioReady = $true; break }
        } catch {}
        Start-Sleep -Milliseconds 250
        $studioProcess.Refresh()
    }
    if (-not $studioReady) { throw 'The server is not ready. See .studio-runtime\server.log.' }
    Write-Host "Studio started: $studioUrl"
    if (-not $NoBrowser) { Start-Process $studioUrl }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
