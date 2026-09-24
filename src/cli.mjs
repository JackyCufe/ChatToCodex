#!/usr/bin/env node
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadApiKey, loadConfig, loadState, saveApiKey, saveConfig } from './config.mjs';
import { setWorkspace } from './workspace.mjs';
import { startRuntime } from './runtime.mjs';

const [, , command = 'help', ...args] = process.argv;
const TUNNEL_ID = /^tunnel_[0-9a-f]{32}$/;

async function setup() {
  const rl = readline.createInterface({ input, output });
  try {
    const current = loadConfig();
    const tunnelId = (await rl.question(`Tunnel ID${current.tunnelId ? ` [${current.tunnelId}]` : ''}: `)).trim() || current.tunnelId;
    if (!TUNNEL_ID.test(tunnelId || '')) throw new Error('Tunnel ID must be tunnel_ followed by 32 lowercase hex characters.');
    const apiKey = (await rl.question(`Tunnel API key${loadApiKey() ? ' [already stored; Enter keeps it]' : ''}: `)).trim();
    saveConfig({ ...current, tunnelId });
    if (apiKey) saveApiKey(apiKey);
    if (!loadApiKey()) throw new Error('API key is required.');
    console.log('\nSetup complete. No workspace is required to connect.');
    console.log('Run: chat-to-codex start');
    console.log('Then choose a project when needed: chat-to-codex workspace /path/to/project');
  } finally { rl.close(); }
}

function status() {
  const config = loadConfig();
  const state = loadState();
  console.log(JSON.stringify({
    configured: TUNNEL_ID.test(config.tunnelId || '') && Boolean(loadApiKey()),
    tunnelId: config.tunnelId || null,
    apiKeyStored: Boolean(loadApiKey()),
    workspace: config.workspace ?? null,
    runtime: state
  }, null, 2));
}

function doctor() {
  const checks = [];
  const config = loadConfig();
  checks.push(['Tunnel ID', TUNNEL_ID.test(config.tunnelId || '')]);
  checks.push(['API key stored', Boolean(loadApiKey())]);
  const candidates = [process.env.TUNNEL_CLIENT_PATH, '/opt/homebrew/bin/tunnel-client', '/usr/local/bin/tunnel-client'].filter(Boolean);
  const bundledOrKnown = candidates.some((p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } });
  const onPath = spawnSync(process.platform === 'win32' ? 'where' : 'sh', process.platform === 'win32' ? ['tunnel-client'] : ['-lc', 'command -v tunnel-client'], { stdio: 'ignore' }).status === 0;
  checks.push(['tunnel-client', bundledOrKnown || onPath]);
  for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (config.workspace) console.log(`✓ Workspace: ${config.workspace}`); else console.log('○ Workspace: none selected (this is valid)');
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

switch (command) {
  case 'setup': await setup(); break;
  case 'start': await startRuntime(); break;
  case 'workspace': {
    if (!args[0]) throw new Error('Usage: chat-to-codex workspace /path/to/project');
    console.log(`Workspace selected: ${setWorkspace(args[0])}`);
    break;
  }
  case 'status': status(); break;
  case 'doctor': doctor(); break;
  default:
    console.log('ChatToCodex\n\nCommands:\n  setup\n  start\n  workspace <path>\n  status\n  doctor');
}
