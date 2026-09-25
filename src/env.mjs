import fs from 'node:fs';
import path from 'node:path';

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function loadDotEnv(file = path.resolve(process.cwd(), '.env')) {
  if (!fs.existsSync(file)) return {};
  const parsed = {};
  for (const raw of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const at = line.indexOf('=');
    if (at <= 0) continue;
    const key = line.slice(0, at).trim();
    const value = unquote(line.slice(at + 1));
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    parsed[key] = value;
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return parsed;
}
