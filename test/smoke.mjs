import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, saveConfig } from '../src/config.mjs';
import { startMcpServer } from '../src/mcp-server.mjs';

const original = loadConfig();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-to-codex-smoke-'));
fs.writeFileSync(path.join(dir, 'hello.txt'), 'hello from ChatToCodex\n');
saveConfig({ ...original, allowedRoots: [dir] });
const server = await startMcpServer();
const headers = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
const call = async (id, method, params) => {
  const res = await fetch(server.url, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
};
try {
  const init = await call(1, 'initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
  if (!init.includes('ChatToCodex')) throw new Error('initialize failed');
  if (!init.includes('No workspace-selection step is required')) throw new Error('workspace-free instructions missing');

  const status = await call(2, 'tools/call', { name: 'access_status', arguments: {} });
  if (!status.includes(dir)) throw new Error('access_status failed');

  const read = await call(3, 'tools/call', { name: 'read_file', arguments: { path: path.join(dir, 'hello.txt') } });
  if (!read.includes('hello from ChatToCodex')) throw new Error('absolute read_file failed');

  const command = await call(4, 'tools/call', { name: 'run_command', arguments: { command: 'pwd', workdir: dir } });
  if (!command.includes(dir)) throw new Error('run_command workdir failed');

  const blocked = await call(5, 'tools/call', { name: 'read_file', arguments: { path: '/etc/hosts' } });
  if (!blocked.includes('PATH_OUTSIDE_ALLOWED_ROOTS')) throw new Error('allowed-root boundary failed');

  console.log('Smoke test passed: any chat can use explicit paths/workdir within allowed roots; no workspace selection required');
} finally {
  saveConfig(original);
  await server.stop();
  fs.rmSync(dir, { recursive: true, force: true });
}
