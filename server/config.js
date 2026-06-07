import { existsSync, readFileSync } from 'node:fs';

export function loadEnvFile(filePath = '.env', targetEnv = process.env) {
  if (!existsSync(filePath)) return targetEnv;

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (targetEnv[key] === undefined) {
      targetEnv[key] = value;
    }
  }
  return targetEnv;
}
