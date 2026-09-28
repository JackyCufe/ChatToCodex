@echo off
setlocal
cd /d "%~dp0"

if not exist "package.json" (
  echo [ChatToCodex] package.json not found next to this installer.
  echo Extract the full ChatToCodex ZIP first, then run this file from that folder.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [ChatToCodex] Node.js was not found on PATH. Install Node.js 20 or newer first.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ChatToCodex] npm was not found on PATH.
  exit /b 1
)

echo [ChatToCodex] Installing dependencies in %CD% ...
call npm install
if errorlevel 1 exit /b %errorlevel%

echo [ChatToCodex] Registering the chat-to-codex command ...
call npm link
if errorlevel 1 (
  echo [ChatToCodex] npm link failed. Trying a direct global install from this folder ...
  call npm install -g "%CD%"
  if errorlevel 1 exit /b %errorlevel%
)

where chat-to-codex >nul 2>nul
if errorlevel 1 (
  echo [ChatToCodex] Installation finished but chat-to-codex is not on PATH.
  echo Run: npm config get prefix
  echo Then add that npm global directory to your user PATH and reopen Command Prompt.
  exit /b 1
)

echo.
echo [ChatToCodex] CLI installed successfully.
echo Next: chat-to-codex install
chat-to-codex help
endlocal
