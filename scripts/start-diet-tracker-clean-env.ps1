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

function Ensure-Dependencies {
  $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
  Write-Host 'Installing dependencies with npm.cmd install...'
  & $npmPath install
}

function Ensure-FrontendAssets {
  $indexPath = Join-Path $repoRoot 'public/index.html'
  if (Test-Path -LiteralPath $indexPath) {
    return
  }

  $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
  Write-Host 'Frontend assets are missing. Building client into public/...'
  & $npmPath run build
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

Ensure-Dependencies
Ensure-FrontendAssets

if ($Background) {
  $startInfo = [System.Diagnostics.ProcessStartInfo]::new()
  $startInfo.FileName = 'cmd.exe'
  $startInfo.Arguments = "/c start """" /min ""$nodePath"" ""server/index.js"""
  $startInfo.WorkingDirectory = $repoRoot
  $startInfo.UseShellExecute = $false
  $startInfo.CreateNoWindow = $true

  $serverProcess = [System.Diagnostics.Process]::Start($startInfo)
  Start-Sleep -Seconds 3
  if ($serverProcess.HasExited -and $serverProcess.ExitCode -ne 0) {
    Write-Host "Diet tracker launch command exited with code $($serverProcess.ExitCode)."
    exit 1
  }

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
