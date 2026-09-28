import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { generatedServiceDefinition } from '../src/service.mjs';

const mac = generatedServiceDefinition('darwin');
if (!mac.includes('com.chat-to-codex.host') || !mac.includes('<string>host</string>')) throw new Error('macOS LaunchAgent definition is incomplete');
const tmp = path.join(os.tmpdir(), `chat-to-codex-${process.pid}.plist`);
fs.writeFileSync(tmp, mac, 'utf8');
const lint = spawnSync('plutil', ['-lint', tmp], { encoding: 'utf8' });
fs.rmSync(tmp, { force: true });
if (process.platform === 'darwin' && lint.status !== 0) throw new Error(`LaunchAgent plist invalid: ${lint.stderr || lint.stdout}`);

const windows = generatedServiceDefinition('win32');
if (!windows.includes('host') || !windows.includes('cli.mjs')) throw new Error('Windows Task Scheduler command is incomplete');

const linux = generatedServiceDefinition('linux');
if (!linux.includes('ExecStart=') || !linux.includes('host') || !linux.includes('Restart=on-failure')) throw new Error('Linux systemd unit is incomplete');

console.log('Service definition test passed: launchd + Task Scheduler + systemd host definitions');
