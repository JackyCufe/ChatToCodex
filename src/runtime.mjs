import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadApiKey, loadConfig, saveState } from './config.mjs';
import { startMcpServer } from './mcp-server.mjs';

const TUNNEL_ID = /^tunnel_[0-9a-f]{32}$/;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function findTunnelClient() {
  const candidates = [
    process.env.TUNNEL_CLIENT_PATH,
    '/opt/homebrew/bin/tunnel-client',
    '/usr/local/bin/tunnel-client',
    path.join(os.homedir(), '.local/bin/tunnel-client')
  ].filter(Boolean);
  for (const candidate of candidates) {
    try { fs.accessSync(candidate, fs.constants.X_OK); return candidate; } catch {}
  }
  return 'tunnel-client';
}

async function waitForHealthFile(file, timeoutMs = 60000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const value = fs.readFileSync(file, 'utf8').trim();
      if (value) return value.replace(/\/$/, '');
    } catch {}
    await sleep(250);
  }
  throw new Error('Timed out waiting for tunnel-client health endpoint');
}

async function healthSnapshot(base) {
  try {
    const [ready, metrics] = await Promise.all([
      fetch(`${base}/readyz`, { signal: AbortSignal.timeout(3000) }),
      fetch(`${base}/metrics`, { signal: AbortSignal.timeout(3000) })
    ]);
    const body = metrics.ok ? await metrics.text() : '';
    const match = body.match(/^commands_poll_last_successful_timestamp_seconds(?:\{[^}]*\})?\s+([0-9.]+)/m);
    return { ready: ready.ok, lastHandshakeAt: match ? Math.round(Number(match[1]) * 1000) : null };
  } catch {
    return { ready: false, lastHandshakeAt: null };
  }
}

export async function startRuntime() {
  const config = loadConfig();
  const apiKey = loadApiKey();
  if (!TUNNEL_ID.test(config.tunnelId || '')) throw new Error('Run setup first: Tunnel ID is missing or invalid.');
  if (!apiKey) throw new Error('Run setup first: Tunnel API key is missing.');

  const mcp = await startMcpServer();
  const runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-to-codex-'));
  const healthFile = path.join(runtimeDir, 'health.url');
  const tunnelBinary = findTunnelClient();
  const args = [
    'run',
    '--control-plane.tunnel-id', config.tunnelId,
    '--health.listen-addr', '127.0.0.1:0',
    '--health.url-file', healthFile,
    '--log.format', 'json',
    '--log.level', 'info'
  ];

  let stopped = false;
  let child = null;
  let healthBase = null;
  let restarts = 0;

  const persist = (extra = {}) => saveState({
    pid: process.pid,
    tunnelPid: child?.pid ?? null,
    mcpUrl: mcp.url,
    tunnelId: config.tunnelId,
    workspace: loadConfig().workspace ?? null,
    healthBase,
    restarts,
    updatedAt: new Date().toISOString(),
    ...extra
  });

  const launch = async () => {
    child = spawn(tunnelBinary, args, {
      env: { ...process.env, CONTROL_PLANE_API_KEY: apiKey, MCP_SERVER_URL: `url=${mcp.url},channel=main` },
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false
    });
    child.stdout.on('data', (chunk) => process.stdout.write(`[tunnel] ${chunk}`));
    child.stderr.on('data', (chunk) => process.stderr.write(`[tunnel] ${chunk}`));
    child.once('error', (err) => process.stderr.write(`Tunnel client error: ${err.message}\n`));
    healthBase = await waitForHealthFile(healthFile);
    persist({ state: 'running' });
    console.log(`ChatToCodex running\nMCP: ${mcp.url}\nTunnel: ${config.tunnelId}\nWorkspace: ${loadConfig().workspace ?? '(none selected yet)'}`);

    child.once('exit', async (code, signal) => {
      if (stopped) return;
      restarts += 1;
      persist({ state: 'restarting', tunnelExit: { code, signal } });
      const delay = Math.min(60000, 1000 * (2 ** Math.min(restarts, 6)));
      await sleep(delay);
      if (!stopped) {
        try { await launch(); } catch (e) { process.stderr.write(`Restart failed: ${e.message}\n`); }
      }
    });
  };

  await launch();
  const monitor = setInterval(async () => {
    if (!healthBase) return;
    const health = await healthSnapshot(healthBase);
    persist({ state: health.ready ? 'running' : 'degraded', ...health });
  }, 15000);

  const stop = async () => {
    if (stopped) return;
    stopped = true;
    clearInterval(monitor);
    if (child && child.exitCode === null) child.kill('SIGTERM');
    await mcp.stop();
    persist({ state: 'stopped' });
  };

  process.once('SIGINT', async () => { await stop(); process.exit(0); });
  process.once('SIGTERM', async () => { await stop(); process.exit(0); });
  return { stop };
}
