import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const homeDir = path.join(os.homedir(), '.chat-to-codex');
export const configPath = path.join(homeDir, 'config.json');
export const credentialPath = path.join(homeDir, 'credentials.json');
export const statePath = path.join(homeDir, 'state.json');

export const defaultConfig = { tunnelId: '', workspace: null };

export function ensureHome() {
  fs.mkdirSync(homeDir, { recursive: true, mode: 0o700 });
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}

export function loadConfig() {
  return { ...defaultConfig, ...readJson(configPath, {}) };
}

export function saveConfig(config) {
  ensureHome();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', { mode: 0o600 });
  try { fs.chmodSync(configPath, 0o600); } catch {}
}

export function saveApiKey(apiKey) {
  ensureHome();
  fs.writeFileSync(credentialPath, JSON.stringify({ apiKey }, null, 2) + '\n', { mode: 0o600 });
  try { fs.chmodSync(credentialPath, 0o600); } catch {}
}

export function loadApiKey() {
  const value = readJson(credentialPath, {}).apiKey;
  return typeof value === 'string' && value.length ? value : null;
}

export function saveState(state) {
  ensureHome();
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
}

export function loadState() {
  return readJson(statePath, {});
}
