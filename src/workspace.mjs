import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, saveConfig } from './config.mjs';

export function getWorkspace() {
  const ws = loadConfig().workspace;
  return typeof ws === 'string' && ws ? ws : null;
}

export function setWorkspace(input) {
  const resolved = path.resolve(input);
  const stat = fs.statSync(resolved);
  if (!stat.isDirectory()) throw new Error('Workspace must be a directory');
  const config = loadConfig();
  config.workspace = resolved;
  saveConfig(config);
  return resolved;
}

export function resolveInWorkspace(relativePath = '.') {
  const workspace = getWorkspace();
  if (!workspace) throw new Error('NO_WORKSPACE_SELECTED');
  const target = path.resolve(workspace, relativePath);
  const root = path.resolve(workspace) + path.sep;
  if (target !== path.resolve(workspace) && !target.startsWith(root)) throw new Error('PATH_OUTSIDE_WORKSPACE');
  return { workspace, target };
}
