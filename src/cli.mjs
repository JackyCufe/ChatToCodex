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
import {
  installService,
  pauseService,
  resumeService,
  serviceDescriptor,
  serviceStatus,
  uninstallService
} from './service.mjs';

loadDotEnv();

const [, , command = 'help', ...args] = process.argv;
const TUNNEL_ID = /^tunnel_[0-9a-f]{32}$/;


async function askSecret(prompt) {
  if (!input.isTTY || typeof input.setRawMode !== 'function') {
    const rl = readline.createInterface({ input, output });
    try { return (await rl.question(prompt)).trim(); } finally { rl.close(); }
  }
  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  input.setEncoding('utf8');
  return await new Promise((resolve, reject) => {
    let value = '';
    const finish = () => {
      input.off('data', onData);
      try { input.setRawMode(false); } catch {}
      input.pause();
      output.write('\n');
      resolve(value.trim());
    };
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\u0003') {
          input.off('data', onData);
          try { input.setRawMode(false); } catch {}
          input.pause();
          output.write('\n');
          reject(new Error('Cancelled'));
          return;
        }
        if (ch === '\r' || ch === '\n') { finish(); return; }
        if (ch === '\u007f' || ch === '\b') { value = value.slice(0, -1); continue; }
        value += ch;
      }
    };
    input.on('data', onData);
  });
}

function prepareCredentials() {
  try { migrateLegacyCredential(); } catch (e) { throw new Error(`Could not migrate legacy API key: ${e.message}`); }
}

function connectionReady() {
  prepareCredentials();
  const config = loadConfig();
  const tunnelId = process.env.OPENAI_TUNNEL_ID || config.tunnelId || '';
  return { tunnelId, tunnelOk: TUNNEL_ID.test(tunnelId), apiKeyOk: Boolean(loadApiKeySecure()) };
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
    rl.pause();
    const apiKey = await askSecret(`Tunnel API key${existingKey ? ' [already stored; Enter keeps it]' : ''}: `);
    rl.resume();
    saveConfig({
      ...current,
      tunnelId,
      allowedRoots: current.allowedRoots?.length ? current.allowedRoots : [os.homedir()]
    });
    if (apiKey) saveApiKeySecure(apiKey);
    if (!loadApiKeySecure()) throw new Error('API key is required.');
    console.log(`\nConnection configured. API key stored in ${credentialBackend()}.`);
    console.log(`Local access root: ${(loadConfig().allowedRoots ?? [os.homedir()]).join(', ')}`);
  } finally { rl.close(); }
}

async function install() {
  const ready = connectionReady();
  if (!ready.tunnelOk || !ready.apiKeyOk) await setup();
  const after = connectionReady();
  if (!after.tunnelOk || !after.apiKeyOk) throw new Error('Tunnel configuration is incomplete.');
  const target = installService({ start: true });
  const descriptor = serviceDescriptor();
  console.log(`\nChatToCodex installed.`);
  console.log(`Background host: ${descriptor.kind}`);
  console.log(`Service target: ${target}`);
  console.log('From now on, open ChatGPT and call the ChatToCodex plugin from any conversation.');
  console.log('Use `chat-to-codex pause` to temporarily block local access and `chat-to-codex resume` to restore it.');
}

function status() {
  prepareCredentials();
  const config = loadConfig();
  const state = loadState();
  const tunnelId = process.env.OPENAI_TUNNEL_ID || config.tunnelId || null;
  console.log(JSON.stringify({
    configured: TUNNEL_ID.test(tunnelId || '') && Boolean(loadApiKeySecure()),
    tunnelId,
    apiKeyStored: Boolean(loadApiKeySecure()),
    credentialBackend: credentialBackend(),
    allowedRoots: config.allowedRoots?.length ? config.allowedRoots : [os.homedir()],
    localAccess: config.paused === true ? 'paused' : 'enabled',
    host: serviceStatus(),
    runtime: state
  }, null, 2));
}

function doctor() {
  prepareCredentials();
  const checks = [];
  const config = loadConfig();
  const tunnelId = process.env.OPENAI_TUNNEL_ID || config.tunnelId || '';
  checks.push(['Tunnel ID', TUNNEL_ID.test(tunnelId)]);
  checks.push([`Secure credential storage (${credentialBackend()})`, secureStorageAvailable()]);
  checks.push(['API key stored', Boolean(loadApiKeySecure())]);
  const candidates = [
    process.env.TUNNEL_CLIENT_PATH,
    ...(process.platform === 'win32'
      ? [
          process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\Programs\\tunnel-client\\tunnel-client.exe`,
          process.env.LOCALAPPDATA && `${process.env.LOCALAPPDATA}\\tunnel-client\\tunnel-client.exe`
        ]
      : ['/opt/homebrew/bin/tunnel-client', '/usr/local/bin/tunnel-client'])
  ].filter(Boolean);
  const bundledOrKnown = candidates.some((p) => { try { fs.accessSync(p, fs.constants.X_OK); return true; } catch { return false; } });
  const onPath = spawnSync(process.platform === 'win32' ? 'where.exe' : 'sh', process.platform === 'win32' ? ['tunnel-client.exe'] : ['-lc', 'command -v tunnel-client'], { stdio: 'ignore' }).status === 0;
  checks.push(['tunnel-client', bundledOrKnown || onPath]);
  for (const [name, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${name}`);
  console.log(`✓ Allowed roots: ${(config.allowedRoots?.length ? config.allowedRoots : [os.homedir()]).join(', ')}`);
  const host = serviceStatus();
  console.log(`${host.installed ? '✓' : '○'} Background host installed (${host.kind})`);
  console.log(`${host.running ? '✓' : '○'} Background host running`);
  console.log(`${config.paused === true ? '○' : '✓'} Local access ${config.paused === true ? 'paused' : 'enabled'}`);
  if (checks.some(([, ok]) => !ok)) process.exitCode = 1;
}

async function host() {
  prepareCredentials();
  const config = loadConfig();
  if (config.paused === true) {
    console.log('ChatToCodex local access is paused.');
    return;
  }
  await startRuntime();
}

function printHelp() {
  console.log(`ChatToCodex\n\nNormal use:\n  install        Configure once and install the always-available local host\n  status         Show connection and host state\n  pause          Temporarily block ChatGPT from reaching local tools\n  resume         Restore local access and background host\n  uninstall      Remove the background host (keeps config/credentials)\n\nAdvanced / development:\n  setup          Configure Tunnel ID and API key only\n  start          Run in the current terminal instead of the background host\n  doctor         Run local diagnostics\n  host           Internal background-host entrypoint\n`);
}

switch (command) {
  case 'install': await install(); break;
  case 'setup': await setup(); break;
  case 'start': prepareCredentials(); await startRuntime(); break;
  case 'host': await host(); break;
  case 'pause': pauseService(); console.log('ChatToCodex local access paused.'); break;
  case 'resume': resumeService(); console.log('ChatToCodex local access resumed.'); break;
  case 'stop': pauseService(); console.log('ChatToCodex local access paused.'); break;
  case 'uninstall': uninstallService(); console.log('ChatToCodex background host removed. Configuration and credentials were kept.'); break;
  case 'status': status(); break;
  case 'doctor': doctor(); break;
  case 'help': printHelp(); break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exitCode = 1;
}
