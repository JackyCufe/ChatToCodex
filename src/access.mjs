import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig } from './config.mjs';

function normalizeRoot(root) {
  const resolved = path.resolve(root.replace(/^~(?=$|\/)/, os.homedir()));
  try { return fs.realpathSync(resolved); } catch { return resolved; }
}

export function allowedRoots() {
  const configured = loadConfig().allowedRoots;
  const roots = Array.isArray(configured) && configured.length ? configured : [os.homedir()];
  return [...new Set(roots.map(normalizeRoot))];
}

export function resolveAllowedPath(inputPath, baseDir) {
  if (!inputPath) throw new Error('PATH_REQUIRED');
  const expanded = inputPath.replace(/^~(?=$|\/)/, os.homedir());
  const requested = path.isAbsolute(expanded)
    ? path.resolve(expanded)
    : path.resolve(baseDir || allowedRoots()[0], expanded);
  let target = requested;
  try { target = fs.realpathSync(requested); } catch {
    const parent = path.dirname(requested);
    let realParent = parent;
    try { realParent = fs.realpathSync(parent); } catch {}
    target = path.join(realParent, path.basename(requested));
  }
  const ok = allowedRoots().some((root) => target === root || target.startsWith(root + path.sep));
  if (!ok) throw new Error(`PATH_OUTSIDE_ALLOWED_ROOTS: ${target}`);
  return target;
}

export function resolveAllowedWorkdir(workdir) {
  const target = resolveAllowedPath(workdir || allowedRoots()[0]);
  if (!fs.statSync(target).isDirectory()) throw new Error('WORKDIR_NOT_DIRECTORY');
  return target;
}
