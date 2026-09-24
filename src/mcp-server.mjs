import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { McpServer, createMcpHandler } from '@modelcontextprotocol/server';
import { localhostHostValidation, localhostOriginValidation, toNodeHandler } from '@modelcontextprotocol/node';
import { z } from 'zod';
import { allowedRoots, resolveAllowedPath, resolveAllowedWorkdir } from './access.mjs';

const text = (value) => ({ content: [{ type: 'text', text: String(value) }] });
const error = (value) => ({ content: [{ type: 'text', text: String(value) }], isError: true });

function buildServer() {
  const server = new McpServer(
    { name: 'ChatToCodex', version: '0.2.0' },
    {
      capabilities: { tools: {} },
      instructions: 'ChatToCodex gives this conversation direct access to local development tools within the configured allowed roots. File tools accept absolute or relative paths, and command execution accepts an explicit workdir. No workspace-selection step is required.'
    }
  );

  server.registerTool('access_status', {
    description: 'Show the local filesystem roots ChatToCodex is allowed to access.',
    inputSchema: z.object({})
  }, async () => text(allowedRoots().join('\n')));

  server.registerTool('list_directory', {
    description: 'List a local directory within ChatToCodex allowed roots. Accepts an absolute path or a path relative to the first allowed root.',
    inputSchema: z.object({ path: z.string().default('.') })
  }, async ({ path: requested }) => {
    try {
      const target = resolveAllowedPath(requested);
      const entries = fs.readdirSync(target, { withFileTypes: true }).slice(0, 300)
        .map((entry) => `${entry.isDirectory() ? 'd' : 'f'} ${entry.name}`);
      return text(entries.join('\n'));
    } catch (e) { return error(e.message); }
  });

  server.registerTool('read_file', {
    description: 'Read a UTF-8 text file within ChatToCodex allowed roots. Accepts absolute or relative paths.',
    inputSchema: z.object({ path: z.string().min(1), max_bytes: z.number().int().min(1).max(1024 * 1024).default(256 * 1024) })
  }, async ({ path: requested, max_bytes }) => {
    try {
      const target = resolveAllowedPath(requested);
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
    description: 'Create or replace a UTF-8 text file within ChatToCodex allowed roots.',
    inputSchema: z.object({ path: z.string().min(1), content: z.string() })
  }, async ({ path: requested, content }) => {
    try {
      const target = resolveAllowedPath(requested);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, content, 'utf8');
      return text(`Wrote ${Buffer.byteLength(content)} bytes to ${target}`);
    } catch (e) { return error(e.message); }
  });

  server.registerTool('run_command', {
    description: 'Run a shell command on this computer. workdir must be inside ChatToCodex allowed roots and may be any project directory; no prior workspace selection is needed.',
    inputSchema: z.object({
      command: z.string().min(1).max(20000),
      workdir: z.string().min(1).max(4096).optional()
    })
  }, async ({ command, workdir }) => {
    try {
      const cwd = resolveAllowedWorkdir(workdir);
      return await new Promise((resolve) => {
        const child = spawn(process.env.SHELL || '/bin/zsh', ['-lc', command], { cwd, env: process.env });
        let output = '';
        const append = (chunk) => { if (output.length < 200000) output += chunk.toString(); };
        child.stdout.on('data', append); child.stderr.on('data', append);
        child.on('error', (e) => resolve(error(e.message)));
        child.on('close', (code) => resolve(text(`exit ${code}\n${output}`)));
      });
    } catch (e) { return error(e.message); }
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
