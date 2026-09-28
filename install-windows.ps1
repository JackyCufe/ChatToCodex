$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not (Test-Path './package.json')) {
  throw 'package.json not found next to this installer. Extract the full ChatToCodex ZIP first.'
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js was not found on PATH. Install Node.js 20 or newer first.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  throw 'npm was not found on PATH.'
}

Write-Host "[ChatToCodex] Installing dependencies in $PWD ..."
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '[ChatToCodex] Registering the chat-to-codex command ...'
npm link
if ($LASTEXITCODE -ne 0) {
  Write-Host '[ChatToCodex] npm link failed. Trying direct global install ...'
  npm install -g $PWD.Path
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Get-Command chat-to-codex -ErrorAction SilentlyContinue)) {
  $prefix = (npm config get prefix).Trim()
  throw "CLI was installed but chat-to-codex is not on PATH. npm prefix: $prefix. Add the npm global executable directory to PATH, reopen PowerShell, and retry."
}

Write-Host ''
Write-Host '[ChatToCodex] CLI installed successfully.'
Write-Host 'Next: chat-to-codex install'
chat-to-codex help
