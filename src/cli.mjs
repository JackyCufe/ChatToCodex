#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig, loadState, saveConfig } from './config.mjs';
import {
  credentialBackend,
  loadApiKeySecure,
  migrateLegacyCredential,
  saveApiKeySecure,
  secureStorageAvailable
} from './credentials.mjs';
import { startRuntime } from './runtime.mjs';
import { loadDotEnv } from './env.mjs';
loadDotEnv();

const [, , command = 'help'] = process.argv;
const TUNNEL_ID = /^tunnel_[0-9a-f]{32}$/;

function prepareCredentials() {
  try { migrateLegacyCredential(); } catch (e) { throw new Error(`Could not migrate legacy API key: ${e.message}`); }
}

async function setup() {
  prepareCredentials();
  const rl = readline.createInterface({ input, output });
  try {
    const current = loadConfig();
    const existingTunnel = process.env.OPENAI_TUNNEL_ID || current.tunnelId;
    const tunnelId = (await rl.question(`Tunnel ID${existingTunnel ? ` [${existingTunnel}]` : ''}: `)).trim() || existingTunnel;
    if (!TUNNEL_ID.test(tunnelId || '')) throw new Error('Tunnel ID must be tunnel_ followed by 32 lowercase hex characters.');
    const existingKey = loadApiKeySecure();
    const apiKey = (await rl.question(`Tunnel API key${existingKey ? ' [already stored; Enter keeps it]' : ''}: `)).trim();
    saveConfig({ ...current, tunnelId, allowedRoots: current.allowedRoots?.length ? current.allowedRoots : [os.homedir()] });
    if (apiKey) saveApiKeySecure(apiKey);
    if (!loadApiKeySecure()) throw new Error('API key is required.');
    console.log(`\nSetup complete. API key stored in ${credentialBackend()}.`);
    console.log(`Local access root: ${(loadConfig().allowedRoots ?? [os.homedir()]).join(', ')}`);
    console.log('No per-chat workspace selection is required. Run: chat-to-codex start');
  } finally { rl.close(); }
}

function status() {
  prepareCredentials();
  const config = loadConfig();
  const state = loadState();
  console.log(JSON.stringify({
    configured: TUNNEL_ID.test(process.env.OPENAI_TUNNEL_ID || config.tunnelId || '') && Boolean(loadApiKeySecure()),
    tunnelId: process.env.OPENAI_TUNNEL_ID || config.tunnelId || null,
    apiKeyStored: Boolean(loadApiKeySecure()),
    credentialBackend: credentialBackend(),
    allowedRoots: config.allowedRoots?.length ? config.allowedRoots : [os.homedir()],
    runtime: state
  }, null, 2));
}

function doctor() {
  prepareCredentials();
  const checks = [];
  const config = loadConfig();
  checks.push(['Tunnel ID', TUNNEL_ID.test(process.env.OPENAI_TUNNEL_ID || config.tunnelId || '')]);
  checks.push([`Secure credential storage (${credentialBackend()})`, secureStorageAvailable()]);
  checks.push(['API key stored', Boolean(loadApiKeySecure())]);
  const candidates = [process.env.TUNNEL_CLIENT_PATH, '/opt/homebrew/bin/tunnel-client', '/usr/local/bin/tunnel-client'].filter(Boolean);
  const bundledOrKnown = candidates.some((p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } });
  const onPath = spawnSync(process.platform === 'win32' ? 'where' : 'sh', process.platform === 'win32' ? ['tunnel-client'] : ['-lc', 'command -v tunnel-client'], { stdio: 'ignore' }).status === 0;
  checks.push(['tunnel-client', bundledOrKnown || onPath]);
  for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${name}`);
  console.log(`✓ Allowed roots: ${(config.allowedRoots?.length ? config.allowedRoots : [os.homedir()]).join(', ')}`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

switch (command) {
  case 'setup': await setup(); break;
  case 'start': prepareCredentials(); await startRuntime(); break;
  case 'status': status(); break;
  case 'doctor': doctor(); break;
  default:
    console.log('ChatToCodex\n\nCommands:\n  setup\n  start\n  status\n  doctor');
}
