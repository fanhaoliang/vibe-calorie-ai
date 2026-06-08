import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('Windows launcher builds frontend assets before serving port 3000', async () => {
  const script = await readFile('scripts/start-diet-tracker-clean-env.ps1', 'utf8');

  assert.match(script, /Ensure-Dependencies/);
  assert.match(script, /Ensure-FrontendAssets/);
  assert.match(script, /npm\.cmd/);
  assert.match(script, /install/);
  assert.match(script, /run build/);
  assert.ok(
    script.indexOf('Ensure-Dependencies') < script.indexOf('Ensure-FrontendAssets'),
    'dependencies must be installed before frontend assets are built'
  );
  assert.ok(
    script.indexOf('Ensure-FrontendAssets') < script.indexOf("& $nodePath 'server/index.js'"),
    'frontend assets must be checked before the foreground server starts'
  );
});

test('background launcher verifies the spawned server process stays alive', async () => {
  const script = await readFile('scripts/start-diet-tracker-clean-env.ps1', 'utf8');

  assert.match(script, /System\.Diagnostics\.ProcessStartInfo/);
  assert.match(script, /HasExited/);
  assert.match(script, /ExitCode/);
});
