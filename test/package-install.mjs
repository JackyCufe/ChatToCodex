import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
if (pkg.bin?.['chat-to-codex'] !== './src/cli.mjs') throw new Error('package.json must expose chat-to-codex -> ./src/cli.mjs');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-to-codex-pack-'));
try {
  const packed = spawnSync('npm', ['pack', '--json', '--pack-destination', tmp], { cwd: root, encoding: 'utf8' });
  if (packed.status !== 0) throw new Error(packed.stderr || packed.stdout || 'npm pack failed');
  const result = JSON.parse(packed.stdout);
  const tarball = path.join(tmp, result[0].filename);
  if (!fs.existsSync(tarball)) throw new Error('npm pack did not create a tarball');
  const listing = spawnSync('tar', ['-tf', tarball], { encoding: 'utf8' });
  if (listing.status !== 0) throw new Error(listing.stderr || 'Could not inspect npm package');
  for (const required of ['package/package.json', 'package/src/cli.mjs', 'package/install-windows.cmd', 'package/install-windows.ps1']) {
    if (!listing.stdout.includes(required)) throw new Error(`Packed package is missing ${required}`);
  }
  if (listing.stdout.includes('package/.env\n')) throw new Error('Packed package must not contain .env');
  console.log('Package install test passed: CLI bin and Windows installers are present; .env is excluded');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
