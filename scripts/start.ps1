param(
    [switch]$Setup,
    [switch]$Check,
    [string]$BindHost = '',
    [int]$Port = 0
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskPython = Join-Path $taskRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
    Write-Host 'Creating a local Python 3.12 environment...'
    & py -3.12 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.12 from python.org, then rerun this script.' }
    $Setup = $true
}
if ($Setup) {
    & $taskPython -m pip install -r requirements-torch.txt
    if ($LASTEXITCODE -ne 0) { throw 'PyTorch installation failed.' }
    & $taskPython -m pip install -r requirements.txt
    if ($LASTEXITCODE -ne 0) { throw 'Dependency installation failed.' }
}
$taskArguments = @('-m', 'app')
if ($Check) { $taskArguments += '--check' }
if ($BindHost) { $taskArguments += @('--host', $BindHost) }
if ($Port -gt 0) { $taskArguments += @('--port', "$Port") }
& $taskPython @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Stock Predictor stopped with an error. Review the output above.' }
