param(
    [switch]$Setup,
    [switch]$Rebuild,
    [int]$Port = 8010
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $taskRoot
$taskPython = Join-Path $taskRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $taskPython)) {
    & py -3.12 -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw 'Install Python 3.12 and retry.' }
    $Setup = $true
}
if ($Setup) {
    & $taskPython -m pip install -r requirements-torch.txt
    if ($LASTEXITCODE -ne 0) { throw 'PyTorch installation failed.' }
    & $taskPython -m pip install -r requirements.txt -r requirements-browser.txt
    if ($LASTEXITCODE -ne 0) { throw 'Build dependency installation failed.' }
    & npm install --global pnpm@11.25.0
    if ($LASTEXITCODE -ne 0) { throw 'Install Node 24 with npm and retry.' }
    & pnpm install --frozen-lockfile --ignore-scripts
    if ($LASTEXITCODE -ne 0) { throw 'Browser runtime installation failed.' }
}
if ($Rebuild -or -not (Test-Path -LiteralPath (Join-Path $taskRoot 'dist\index.html'))) {
    & $taskPython scripts/build_pages.py
    if ($LASTEXITCODE -ne 0) { throw 'Static build failed.' }
}
& $taskPython scripts/serve_browser.py --port $Port
if ($LASTEXITCODE -ne 0) { throw 'Static preview stopped with an error.' }
