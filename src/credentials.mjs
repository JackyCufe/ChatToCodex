import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { credentialPath } from './config.mjs';

const SERVICE = 'ChatToCodex';
const ACCOUNT = 'openai-tunnel-api-key';

function run(command, args, input) {
  const result = spawnSync(command, args, {
    input,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
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

function macDelete() {
  run('security', ['delete-generic-password', '-s', SERVICE, '-a', ACCOUNT]);
}

function linuxGet() {
  const result = run('secret-tool', ['lookup', 'service', SERVICE, 'account', ACCOUNT]);
  return result.ok && result.stdout ? result.stdout : null;
}

function linuxSet(value) {
  const result = run('secret-tool', ['store', '--label', 'ChatToCodex OpenAI Tunnel API key', 'service', SERVICE, 'account', ACCOUNT], `${value}\n`);
  if (!result.ok) throw new Error(result.stderr || 'Could not store API key in Secret Service');
}

function linuxDelete() {
  run('secret-tool', ['clear', 'service', SERVICE, 'account', ACCOUNT]);
}

function windowsScript(action, value = '') {
  const escaped = value.replace(/'/g, "''");
  if (action === 'get') {
    return `$c=Get-StoredCredential -Target '${SERVICE}:${ACCOUNT}' -ErrorAction SilentlyContinue; if($c){$c.GetNetworkCredential().Password}`;
  }
  if (action === 'set') {
    return `New-StoredCredential -Target '${SERVICE}:${ACCOUNT}' -UserName '${ACCOUNT}' -Password '${escaped}' -Persist LocalMachine | Out-Null`;
  }
  return `Remove-StoredCredential -Target '${SERVICE}:${ACCOUNT}' -ErrorAction SilentlyContinue | Out-Null`;
}

function windowsRun(action, value) {
  const result = run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsScript(action, value)]);
  if (!result.ok && /Get-StoredCredential|New-StoredCredential|Remove-StoredCredential/.test(result.stderr)) {
    throw new Error('Windows Credential Manager support requires the CredentialManager PowerShell module.');
  }
  return result;
}

export function credentialBackend() {
  if (process.platform === 'darwin') return 'macOS Keychain';
  if (process.platform === 'win32') return 'Windows Credential Manager';
  if (process.platform === 'linux') return 'Secret Service';
  return 'unsupported';
}

export function loadApiKeySecure() {
  if (process.platform === 'darwin') return macGet();
  if (process.platform === 'linux') return linuxGet();
  if (process.platform === 'win32') {
    const result = windowsRun('get');
    return result.ok && result.stdout ? result.stdout : null;
  }
  return null;
}

export function saveApiKeySecure(value) {
  if (!value) return deleteApiKeySecure();
  if (process.platform === 'darwin') return macSet(value);
  if (process.platform === 'linux') return linuxSet(value);
  if (process.platform === 'win32') {
    const result = windowsRun('set', value);
    if (!result.ok) throw new Error(result.stderr || 'Could not store API key in Windows Credential Manager');
    return;
  }
  throw new Error(`Secure credential storage is not supported on ${process.platform}`);
}

export function deleteApiKeySecure() {
  if (process.platform === 'darwin') return macDelete();
  if (process.platform === 'linux') return linuxDelete();
  if (process.platform === 'win32') return void windowsRun('delete');
}

export function migrateLegacyCredential() {
  if (!fs.existsSync(credentialPath)) return false;
  let value = null;
  try {
    const parsed = JSON.parse(fs.readFileSync(credentialPath, 'utf8'));
    value = typeof parsed.apiKey === 'string' && parsed.apiKey ? parsed.apiKey : null;
  } catch {}
  if (!value) {
    fs.rmSync(credentialPath, { force: true });
    return false;
  }
  if (!loadApiKeySecure()) saveApiKeySecure(value);
  fs.rmSync(credentialPath, { force: true });
  return true;
}

export function secureStorageAvailable() {
  if (process.platform === 'darwin') return run('security', ['help']).ok;
  if (process.platform === 'linux') return run('sh', ['-lc', 'command -v secret-tool >/dev/null 2>&1']).ok;
  if (process.platform === 'win32') {
    try { windowsRun('get'); return true; } catch { return false; }
  }
  return false;
}
