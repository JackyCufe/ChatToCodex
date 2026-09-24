import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { z } from 'zod';
import { getWorkspace, resolveInWorkspace, setWorkspace } from './workspace.mjs';

const text = (value) => ({ content: [{ type: 'text', text: String(value) }] });
const error = (value) => ({ content: [{ type: 'text', text: String(value) }], isError: true });

function buildServer() {
  const server = new McpServer(
    { name: 'ChatToCodex', version: '0.1.0' },
    { capabilities: { tools: {} }, instructions: 'ChatToCodex gives this conversation access only to the currently selected local workspace. If no workspace is selected, ask the user to select one before file or command operations.' }
  );

  server.registerTool('workspace_status', {
    description: 'Show the currently selected local workspace.',
    inputSchema: z.object({})
  }, async () => text(getWorkspace() ?? 'No workspace selected.'));

  server.registerTool('set_workspace', {
    description: 'Select a local directory as the active workspace. The directory must already exist on this computer.',
    inputSchema: z.object({ path: z.string().min(1).max(4096) })
  }, async ({ path: requested }) => {
    try { return text(`Workspace selected: ${setWorkspace(requested)}`); }
    catch (e) { return error(e.message); }
  });

  server.registerTool('list_directory', {
    description: 'List one directory inside the active workspace.',
    inputSchema: z.object({ path: z.string().default('.') })
  }, async ({ path: relative }) => {
    try {
      const { target } = resolveInWorkspace(relative);
      const entries = fs.readdirSync(target, { withFileTypes: true }).slice(0, 300)
        .map((entry) => `${entry.isDirectory() ? 'd' : 'f'} ${entry.name}`);
      return text(entries.join('\n'));
    } catch (e) { return error(e.message); }
  });

  server.registerTool('read_file', {
    description: 'Read a UTF-8 text file inside the active workspace.',
    inputSchema: z.object({ path: z.string().min(1), max_bytes: z.number().int().min(1).max(1024 * 1024).default(256 * 1024) })
  }, async ({ path: relative, max_bytes }) => {
    try {
      const { target } = resolveInWorkspace(relative);
      const stat = fs.statSync(target);
      if (!stat.isFile()) return error('Not a file');
      const fd = fs.openSync(target, 'r');
      const size = Math.min(stat.size, max_bytes);
      const buffer = Buffer.alloc(size);
      fs.readSync(fd, buffer, 0, size, 0);
      fs.closeSync(fd);
      const suffix = stat.size > max_bytes ? `\n\n[truncated at ${max_bytes} bytes]` : '';
      return text(buffer.toString('utf8') + suffix);
    } catch (e) { return error(e.message); }
  });

  server.registerTool('write_file', {
    description: 'Create or replace a UTF-8 text file inside the active workspace.',
    inputSchema: z.object({ path: z.string().min(1), content: z.string() })
  }, async ({ path: relative, content }) => {
    try {
      const { target } = resolveInWorkspace(relative);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
      return text(`Wrote ${Buffer.byteLength(content)} bytes to ${relative}`);
    } catch (e) { return error(e.message); }
  });

  server.registerTool('run_command', {
    description: 'Run a shell command with the active workspace as cwd.',
    inputSchema: z.object({ command: z.string().min(1).max(20000) })
  }, async ({ command }) => {
    const workspace = getWorkspace();
    if (!workspace) return error('NO_WORKSPACE_SELECTED');
    return await new Promise((resolve) => {
      const child = spawn(process.env.SHELL || '/bin/zsh', ['-lc', command], { cwd: workspace, env: process.env });
      let output = '';
      const append = (chunk) => { if (output.length < 200000) output += chunk.toString(); };
      child.stdout.on('data', append); child.stderr.on('data', append);
      child.on('error', (e) => resolve(error(e.message)));
      child.on('close', (code) => resolve(text(`exit ${code}\n${output}`)));
    });
  });

  return server;
}

export async function startMcpServer() {
  const token = crypto.randomBytes(32).toString('base64url');
  const basePath = `/mcp/${token}`;
  const handler = toNodeHandler(createMcpHandler(() => buildServer()));
  const checkHost = localhostHostValidation();
  const checkOrigin = localhostOriginValidation();

  const server = http.createServer((req, res) => {
    const pathname = (req.url || '').split('?')[0];
    if (pathname !== basePath) {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }
    if (!checkHost(req, res) || !checkOrigin(req, res)) return;
    handler(req, res);
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => { server.off('error', reject); resolve(); });
  });
  const address = server.address();
  const url = `http://127.0.0.1:${address.port}${basePath}`;
  return { url, port: address.port, stop: () => new Promise((resolve) => server.close(resolve)) };
}
