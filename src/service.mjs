import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ensureHome, homeDir, loadConfig, loadState, saveConfig } from './config.mjs';

const LABEL = 'com.chat-to-codex.host';
const WINDOWS_TASK = 'ChatToCodex Host';
const thisFile = fileURLToPath(import.meta.url);
const cliPath = path.join(path.dirname(thisFile), 'cli.mjs');
const nodePath = process.execPath;
const outLog = path.join(homeDir, 'host.log');
const errLog = path.join(homeDir, 'host.error.log');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  return { ok: result.status === 0, status: result.status, stdout: result.stdout?.trim() ?? '', stderr: result.stderr?.trim() ?? '' };
}

function xml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function launchAgentPath() {
  return path.join(os.homedir(), 'Library', 'LaunchAgents', `${LABEL}.plist`);
}

function launchAgentContents() {
  const cwd = path.dirname(path.dirname(thisFile));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0">\n<dict>\n  <key>Label</key><string>${LABEL}</string>\n  <key>ProgramArguments</key>\n  <array>\n    <string>${xml(nodePath)}</string>\n    <string>${xml(cliPath)}</string>\n    <string>host</string>\n  </array>\n  <key>WorkingDirectory</key><string>${xml(cwd)}</string>\n  <key>RunAtLoad</key><true/>\n  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>\n  <key>ProcessType</key><string>Background</string>\n  <key>StandardOutPath</key><string>${xml(outLog)}</string>\n  <key>StandardErrorPath</key><string>${xml(errLog)}</string>\n</dict>\n</plist>\n`;
}

function macDomain() {
  return `gui/${process.getuid()}`;
}

function macInstalled() {
  return fs.existsSync(launchAgentPath());
}

function macRunning() {
  return run('launchctl', ['print', `${macDomain()}/${LABEL}`]).ok;
}

function installMac({ start = true } = {}) {
  ensureHome();
  const plist = launchAgentPath();
  fs.mkdirSync(path.dirname(plist), { recursive: true });
  fs.writeFileSync(plist, launchAgentContents(), 'utf8');
  run('launchctl', ['bootout', `${macDomain()}/${LABEL}`]);
  if (start) {
    const loaded = run('launchctl', ['bootstrap', macDomain(), plist]);
    if (!loaded.ok) throw new Error(loaded.stderr || 'Could not bootstrap ChatToCodex LaunchAgent');
  }
  return plist;
}

function pauseMac() {
  run('launchctl', ['bootout', `${macDomain()}/${LABEL}`]);
}

function resumeMac() {
  if (!macInstalled()) installMac({ start: true });
  else if (!macRunning()) {
    const loaded = run('launchctl', ['bootstrap', macDomain(), launchAgentPath()]);
    if (!loaded.ok) throw new Error(loaded.stderr || 'Could not resume ChatToCodex LaunchAgent');
  }
}

function uninstallMac() {
  pauseMac();
  fs.rmSync(launchAgentPath(), { force: true });
}

function quoteWindowsArg(value) {
  return `"${value.replaceAll('"', '\\"')}"`;
}

function windowsTaskCommand() {
  return `${quoteWindowsArg(nodePath)} ${quoteWindowsArg(cliPath)} host`;
}

function windowsInstalled() {
  return run('schtasks.exe', ['/Query', '/TN', WINDOWS_TASK]).ok;
}

function windowsRunning() {
  const result = run('schtasks.exe', ['/Query', '/TN', WINDOWS_TASK, '/FO', 'LIST', '/V']);
  return result.ok && /Running/i.test(result.stdout);
}

function installWindows({ start = true } = {}) {
  ensureHome();
  const created = run('schtasks.exe', [
    '/Create', '/F', '/SC', 'ONLOGON', '/RL', 'LIMITED', '/TN', WINDOWS_TASK,
    '/TR', windowsTaskCommand()
  ]);
  if (!created.ok) throw new Error(created.stderr || created.stdout || 'Could not create ChatToCodex scheduled task');
  if (start) {
    const started = run('schtasks.exe', ['/Run', '/TN', WINDOWS_TASK]);
    if (!started.ok) throw new Error(started.stderr || started.stdout || 'Could not start ChatToCodex scheduled task');
  }
  return WINDOWS_TASK;
}

function pauseWindows() {
  run('schtasks.exe', ['/End', '/TN', WINDOWS_TASK]);
  run('schtasks.exe', ['/Change', '/TN', WINDOWS_TASK, '/Disable']);
}

function resumeWindows() {
  if (!windowsInstalled()) installWindows({ start: true });
  else {
    const enabled = run('schtasks.exe', ['/Change', '/TN', WINDOWS_TASK, '/Enable']);
    if (!enabled.ok) throw new Error(enabled.stderr || enabled.stdout || 'Could not enable ChatToCodex scheduled task');
    const started = run('schtasks.exe', ['/Run', '/TN', WINDOWS_TASK]);
    if (!started.ok) throw new Error(started.stderr || started.stdout || 'Could not start ChatToCodex scheduled task');
  }
}

function uninstallWindows() {
  run('schtasks.exe', ['/End', '/TN', WINDOWS_TASK]);
  run('schtasks.exe', ['/Delete', '/F', '/TN', WINDOWS_TASK]);
}

function linuxUnitPath() {
  return path.join(os.homedir(), '.config', 'systemd', 'user', 'chat-to-codex.service');
}

function linuxUnitContents() {
  const cwd = path.dirname(path.dirname(thisFile));
  return `[Unit]\nDescription=ChatToCodex local MCP host\nAfter=network-online.target\n\n[Service]\nType=simple\nWorkingDirectory=${cwd}\nExecStart=${nodePath} ${cliPath} host\nRestart=on-failure\nRestartSec=3\n\n[Install]\nWantedBy=default.target\n`;
}

function linuxInstalled() { return fs.existsSync(linuxUnitPath()); }
function linuxRunning() { return run('systemctl', ['--user', 'is-active', '--quiet', 'chat-to-codex.service']).ok; }
function installLinux({ start = true } = {}) {
  const unit = linuxUnitPath();
  fs.mkdirSync(path.dirname(unit), { recursive: true });
  fs.writeFileSync(unit, linuxUnitContents(), 'utf8');
  run('systemctl', ['--user', 'daemon-reload']);
  const enabled = run('systemctl', ['--user', 'enable', 'chat-to-codex.service']);
  if (!enabled.ok) throw new Error(enabled.stderr || 'Could not enable ChatToCodex systemd service');
  if (start) {
    const started = run('systemctl', ['--user', 'restart', 'chat-to-codex.service']);
    if (!started.ok) throw new Error(started.stderr || 'Could not start ChatToCodex systemd service');
  }
  return unit;
}
function pauseLinux() { run('systemctl', ['--user', 'stop', 'chat-to-codex.service']); }
function resumeLinux() {
  if (!linuxInstalled()) installLinux({ start: true });
  else {
    run('systemctl', ['--user', 'enable', 'chat-to-codex.service']);
    const started = run('systemctl', ['--user', 'restart', 'chat-to-codex.service']);
    if (!started.ok) throw new Error(started.stderr || 'Could not resume ChatToCodex service');
  }
}
function uninstallLinux() {
  run('systemctl', ['--user', 'disable', '--now', 'chat-to-codex.service']);
  fs.rmSync(linuxUnitPath(), { force: true });
  run('systemctl', ['--user', 'daemon-reload']);
}

export function serviceDescriptor() {
  if (process.platform === 'darwin') return { kind: 'launchd', target: launchAgentPath() };
  if (process.platform === 'win32') return { kind: 'Task Scheduler', target: WINDOWS_TASK };
  if (process.platform === 'linux') return { kind: 'systemd --user', target: linuxUnitPath() };
  return { kind: 'unsupported', target: null };
}

export function installService(options) {
  const config = loadConfig();
  saveConfig({ ...config, paused: false, autostart: true });
  if (process.platform === 'darwin') return installMac(options);
  if (process.platform === 'win32') return installWindows(options);
  if (process.platform === 'linux') return installLinux(options);
  throw new Error(`Autostart is not supported on ${process.platform}`);
}

export function pauseService() {
  const config = loadConfig();
  saveConfig({ ...config, paused: true });
  if (process.platform === 'darwin') return pauseMac();
  if (process.platform === 'win32') return pauseWindows();
  if (process.platform === 'linux') return pauseLinux();
}

export function resumeService() {
  const config = loadConfig();
  saveConfig({ ...config, paused: false, autostart: true });
  if (process.platform === 'darwin') return resumeMac();
  if (process.platform === 'win32') return resumeWindows();
  if (process.platform === 'linux') return resumeLinux();
}

export function uninstallService() {
  const config = loadConfig();
  saveConfig({ ...config, paused: true, autostart: false });
  if (process.platform === 'darwin') return uninstallMac();
  if (process.platform === 'win32') return uninstallWindows();
  if (process.platform === 'linux') return uninstallLinux();
}

export function serviceStatus() {
  const config = loadConfig();
  let installed = false;
  let running = false;
  if (process.platform === 'darwin') { installed = macInstalled(); running = macRunning(); }
  else if (process.platform === 'win32') { installed = windowsInstalled(); running = windowsRunning(); }
  else if (process.platform === 'linux') { installed = linuxInstalled(); running = linuxRunning(); }
  const state = loadState();
  return {
    ...serviceDescriptor(),
    installed,
    running,
    paused: config.paused === true,
    autostart: config.autostart === true,
    pid: state.pid ?? null,
    tunnelPid: state.tunnelPid ?? null,
    runtimeState: state.state ?? null,
    updatedAt: state.updatedAt ?? null,
    logs: process.platform === 'darwin' ? { stdout: outLog, stderr: errLog } : null
  };
}

export function generatedServiceDefinition(platform = process.platform) {
  if (platform === 'darwin') return launchAgentContents();
  if (platform === 'win32') return windowsTaskCommand();
  if (platform === 'linux') return linuxUnitContents();
  return '';
}
