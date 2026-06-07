param(
  [switch]$Background,
  [switch]$OpenBrowser
)

$ErrorActionPreference = 'Stop'

function Normalize-ProcessPath {
  $pathValue = [Environment]::GetEnvironmentVariable('Path', 'Process')
  $upperPathValue = [Environment]::GetEnvironmentVariable('PATH', 'Process')

  if ([string]::IsNullOrWhiteSpace($pathValue)) {
    $pathValue = $upperPathValue
  } elseif ($upperPathValue -and $upperPathValue.Contains('.sbx-denybin')) {
    $pathValue = $upperPathValue
  }

  if ([string]::IsNullOrWhiteSpace($pathValue)) {
    throw 'No process Path/PATH value is available.'
  }

  [Environment]::SetEnvironmentVariable('PATH', $null, 'Process')
  [Environment]::SetEnvironmentVariable('Path', $pathValue, 'Process')
}

function Test-PortListening {
  param([int]$Port)

  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $connect = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $connected = $connect.AsyncWaitHandle.WaitOne(500, $false)
    if ($connected) {
      $client.EndConnect($connect)
    }
    $client.Close()
    return $connected
  } catch {
    return $false
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node.exe -ErrorAction Stop).Source

Normalize-ProcessPath
Set-Location $repoRoot

if (Test-PortListening -Port 3000) {
  Write-Host 'Diet tracker is already running at http://127.0.0.1:3000'
  if ($OpenBrowser) {
    Start-Process 'http://127.0.0.1:3000'
  }
  exit 0
}

if ($Background) {
  Start-Process `
    -FilePath $nodePath `
    -ArgumentList @('server/index.js') `
    -WorkingDirectory $repoRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput (Join-Path $repoRoot 'server.log') `
    -RedirectStandardError (Join-Path $repoRoot 'server.err.log')

  Start-Sleep -Seconds 1
  if (Test-PortListening -Port 3000) {
    Write-Host 'Diet tracker started at http://127.0.0.1:3000'
    if ($OpenBrowser) {
      Start-Process 'http://127.0.0.1:3000'
    }
    exit 0
  }

  Write-Host 'Diet tracker did not start. Check server.err.log.'
  exit 1
}

if ($OpenBrowser) {
  Start-Job -ScriptBlock {
    Start-Sleep -Seconds 2
    Start-Process 'http://127.0.0.1:3000'
  } | Out-Null
}

Write-Host 'Starting diet tracker at http://127.0.0.1:3000'
Write-Host 'Keep this window open while using the app. Close it to stop the app.'
& $nodePath 'server/index.js'
