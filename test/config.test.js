import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import { loadEnvFile } from '../server/config.js';

test('loads LLM settings from a .env file without overwriting existing values', () => {
  const dir = mkdtempSync(join(tmpdir(), 'diet-env-'));
  const file = join(dir, '.env');
  writeFileSync(file, [
    'LLM_A_API_KEY=from-file',
    'LLM_A_BASE_URL=https://api.example.com/v1',
    'LLM_A_MODEL=model-a',
    'LLM_TIMEOUT_MS=7000'
  ].join('\n'));

  const env = { LLM_A_API_KEY: 'already-set' };
  loadEnvFile(file, env);

  assert.equal(env.LLM_A_API_KEY, 'already-set');
  assert.equal(env.LLM_A_BASE_URL, 'https://api.example.com/v1');
  assert.equal(env.LLM_A_MODEL, 'model-a');
  assert.equal(env.LLM_TIMEOUT_MS, '7000');
});
