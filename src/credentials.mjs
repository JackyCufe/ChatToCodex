import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { credentialPath, ensureHome, homeDir } from './config.mjs';

const SERVICE = 'ChatToCodex';
const ACCOUNT = 'openai-tunnel-api-key';
const WINDOWS_SECRET = path.join(homeDir, 'credentials.windows.dpapi');

function run(command, args, input) {
  const result = spawnSync(command, args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  return { ok: result.status === 0, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? '' };
}

function macGet() {
  const result = run('security', ['find-generic-password', '-s', SERVICE, '-a', ACCOUNT, '-w']);
  return result.ok && result.stdout ? result.stdout : null;
}
function macSet(value) {
  const result = run('security', ['add-generic-password', '-U', '-s', SERVICE, '-a', ACCOUNT, '-w', value]);
  if (!result.ok) throw new Error(result.stderr || 'Could not store API key in macOS Keychain');
}
function macDelete() { run('security', ['delete-generic-password', '-s', SERVICE, '-a', ACCOUNT]); }

function linuxGet() {
  const result = run('secret-tool', ['lookup', 'service', SERVICE, 'account', ACCOUNT]);
  return result.ok && result.stdout ? result.stdout : null;
}
function linuxSet(value) {
  const result = run('secret-tool', ['store', '--label', 'ChatToCodex OpenAI Tunnel API key', 'service', SERVICE, 'account', ACCOUNT], `${value}\n`);
  if (!result.ok) throw new Error(result.stderr || 'Could not store API key in Secret Service');
}
function linuxDelete() { run('secret-tool', ['clear', 'service', SERVICE, 'account', ACCOUNT]); }

function ps(script, input = '') {
  return run('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script], input);
}

function windowsGet() {
  if (!fs.existsSync(WINDOWS_SECRET)) return null;
  const script = `$b=[IO.File]::ReadAllBytes('${WINDOWS_SECRET.replace(/'/g, "''")}');$p=[Security.Cryptography.ProtectedData]::Unprotect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[Text.Encoding]::UTF8.GetString($p)`;
  const result = ps(script);
  return result.ok && result.stdout ? result.stdout : null;
}
function windowsSet(value) {
  ensureHome();
  const target = WINDOWS_SECRET.replace(/'/g, "''");
  const script = `$v=[Console]::In.ReadToEnd();$b=[Text.Encoding]::UTF8.GetBytes($v);$p=[Security.Cryptography.ProtectedData]::Protect($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);[IO.File]::WriteAllBytes('${target}',$p)`;
  const result = ps(script, value);
  if (!result.ok) throw new Error(result.stderr || 'Could not protect API key with Windows DPAPI');
}
function windowsDelete() { try { fs.rmSync(WINDOWS_SECRET, { force: true }); } catch {} }

export function credentialBackend() {
  if (process.platform === 'darwin') return 'macOS Keychain';
  if (process.platform === 'win32') return 'Windows DPAPI (CurrentUser)';
  if (process.platform === 'linux') return 'Secret Service';
  return 'unsupported';
}

export function loadApiKeySecure() {
  if (process.env.OPENAI_TUNNEL_API_KEY) return process.env.OPENAI_TUNNEL_API_KEY;
  if (process.platform === 'darwin') return macGet();
  if (process.platform === 'linux') return linuxGet();
  if (process.platform === 'win32') return windowsGet();
  return null;
}

export function saveApiKeySecure(value) {
  if (!value) return deleteApiKeySecure();
  if (process.platform === 'darwin') return macSet(value);
  if (process.platform === 'linux') return linuxSet(value);
  if (process.platform === 'win32') return windowsSet(value);
  throw new Error(`Secure credential storage is not supported on ${process.platform}`);
}

export function deleteApiKeySecure() {
  if (process.platform === 'darwin') return macDelete();
  if (process.platform === 'linux') return linuxDelete();
  if (process.platform === 'win32') return windowsDelete();
}

export function migrateLegacyCredential() {
  if (!fs.existsSync(credentialPath)) return false;
  let value = null;
  try {
    const parsed = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    value = typeof parsed.apiKey === 'string' && parsed.apiKey ? parsed.apiKey : null;
  } catch {}
  if (!value) { fs.rmSync(credentialPath, { force: true }); return false; }
  if (!loadApiKeySecure()) saveApiKeySecure(value);
  fs.rmSync(credentialPath, { force: true });
  return true;
}

export function secureStorageAvailable() {
  if (process.env.OPENAI_TUNNEL_API_KEY) return true;
  if (process.platform === 'darwin') return run('security', ['help']).ok;
  if (process.platform === 'linux') return run('sh', ['-lc', 'command -v secret-tool >/dev/null 2>&1']).ok;
  if (process.platform === 'win32') return run('where.exe', ['powershell.exe']).ok;
  return false;
}
