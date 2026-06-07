import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import { logReadable, logStructured } from '../server/logger.js';

test('readable LLM logs use human Shanghai time', () => {
  const originalReadableLogFile = process.env.LLM_READABLE_LOG_FILE;
  const readableLogFile = join(mkdtempSync(join(tmpdir(), 'diet-readable-')), 'llm-readable.log');
  process.env.LLM_READABLE_LOG_FILE = readableLogFile;

  try {
    logReadable('llm', 'hello');

    const log = readFileSync(readableLogFile, 'utf8');
    assert.match(log, /\[llm\] \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} 上海时间 hello/);
    assert.doesNotMatch(log, /T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  } finally {
    if (originalReadableLogFile === undefined) {
      delete process.env.LLM_READABLE_LOG_FILE;
    } else {
      process.env.LLM_READABLE_LOG_FILE = originalReadableLogFile;
    }
  }
});

test('structured LLM logs use human Shanghai time', () => {
  const originalLogFile = process.env.LLM_LOG_FILE;
  const logFile = join(mkdtempSync(join(tmpdir(), 'diet-llm-')), 'llm.log');
  process.env.LLM_LOG_FILE = logFile;

  try {
    logStructured('llm-request', 'request_start', { label: 'LLM_A' });

    const log = readFileSync(logFile, 'utf8');
    assert.match(log, /^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3} 上海时间\] request_start/m);
    assert.doesNotMatch(log, /T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
  } finally {
    if (originalLogFile === undefined) {
      delete process.env.LLM_LOG_FILE;
    } else {
      process.env.LLM_LOG_FILE = originalLogFile;
    }
  }
});
