import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, saveConfig } from '../src/config.mjs';
import { startMcpServer } from '../src/mcp-server.mjs';

const original = loadConfig();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-to-codex-smoke-'));
fs.writeFileSync(path.join(dir, 'hello.txt'), 'hello from ChatToCodex\n');
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
  const selected = await call(2, 'tools/call', { name: 'set_workspace', arguments: { path: dir } });
  if (!selected.includes(dir)) throw new Error('set_workspace failed');
  const read = await call(3, 'tools/call', { name: 'read_file', arguments: { path: 'hello.txt' } });
  if (!read.includes('hello from ChatToCodex')) throw new Error('read_file failed');
  console.log('Smoke test passed: MCP initialize → set_workspace → read_file');
} finally {
  saveConfig(original);
  await server.stop();
  fs.rmSync(dir, { recursive: true, force: true });
}
