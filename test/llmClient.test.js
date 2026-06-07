import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { test } from 'node:test';

import { buildParsePrompt, createConfiguredParser } from '../server/llmClient.js';
import { parseCache } from '../server/cache.js';

test('builds a Chinese parse prompt with the fixed JSON contract', () => {
  const prompt = buildParsePrompt('一个包子，喝了一瓶水');

  assert.match(prompt, /你是一个饮食热量解析助手/);
  assert.match(prompt, /foodItems/);
  assert.match(prompt, /waterItems/);
  assert.match(prompt, /ignoredItems/);
  assert.match(prompt, /炸鸡排/);
  assert.match(prompt, /油炸\/煎制/);
  assert.match(prompt, /只返回 JSON object/);
});

test('configured parser falls back to rules when no LLM keys exist', async () => {
  const parser = createConfiguredParser({});
  const result = await parser('一个包子，2个鸡蛋');

  assert.equal(result.parseSource, 'rule_fallback');
  assert.equal(result.finalTotalCalories, 360);
});

test('configured parser defaults LLM timeout to 30 seconds', async () => {
  const originalLogFile = process.env.LLM_LOG_FILE;
  const logFile = join(mkdtempSync(join(tmpdir(), 'diet-llm-')), 'llm.log');
  process.env.LLM_LOG_FILE = logFile;

  try {
    createConfiguredParser({});

    const log = readFileSync(logFile, 'utf8');
    assert.match(log, /"timeoutMs":30000/);
  } finally {
    if (originalLogFile === undefined) {
      delete process.env.LLM_LOG_FILE;
    } else {
      process.env.LLM_LOG_FILE = originalLogFile;
    }
  }
});

test('logs provider response body when an LLM request fails', async () => {
  const originalFetch = globalThis.fetch;
  const originalLogFile = process.env.LLM_LOG_FILE;
  const logFile = join(mkdtempSync(join(tmpdir(), 'diet-llm-')), 'llm.log');
  process.env.LLM_LOG_FILE = logFile;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: {
      message: 'invalid model',
      code: 'invalid_request_error'
    }
  }), { status: 400, headers: { 'content-type': 'application/json' } });

  try {
    const parser = createConfiguredParser({
      LLM_A_API_KEY: 'test-key',
      LLM_A_BASE_URL: 'https://api.example.com/v1',
      LLM_A_MODEL: 'bad-model',
      LLM_TIMEOUT_MS: '1000'
    });

    await parser('一个包子');

    const log = readFileSync(logFile, 'utf8');
    assert.match(log, /request_failed/);
    assert.match(log, /"status":400/);
    assert.match(log, /invalid model/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLogFile === undefined) {
      delete process.env.LLM_LOG_FILE;
    } else {
      process.env.LLM_LOG_FILE = originalLogFile;
    }
  }
});

test('short input uses the multi-model path unless fast path is explicitly enabled', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);

    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              parseStatus: 'success',
              totalCalories: body.model === 'model-a' ? 95 : 105,
              needReview: false,
              reviewReason: '',
              foodItems: [
                {
                  rawText: 'fried egg',
                  name: 'egg',
                  quantity: 1,
                  unit: 'item',
                  calories: body.model === 'model-a' ? 95 : 105,
                  status: 'recognized',
                  needReview: false,
                  reviewReason: ''
                }
              ],
              waterItems: [],
              ignoredItems: []
            })
          }
        }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const parser = createConfiguredParser({
      LLM_A_API_KEY: 'test-key',
      LLM_A_BASE_URL: 'https://api.example.com/v1',
      LLM_A_MODEL: 'model-a',
      LLM_B_API_KEY: 'test-key',
      LLM_B_BASE_URL: 'https://api.example.com/v1',
      LLM_B_MODEL: 'model-b',
      LLM_TIMEOUT_MS: '1000'
    });

    const result = await parser('fried egg');

    assert.deepEqual(requests.map(request => request.model).sort(), ['model-a', 'model-b']);
    assert.notEqual(result.parseSource, 'fast_path');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('writes readable Chinese summaries to a separate LLM log', async () => {
  const originalFetch = globalThis.fetch;
  const originalReadableLogFile = process.env.LLM_READABLE_LOG_FILE;
  const readableLogFile = join(mkdtempSync(join(tmpdir(), 'diet-readable-')), 'llm-readable.log');
  process.env.LLM_READABLE_LOG_FILE = readableLogFile;

  globalThis.fetch = async () => new Response(JSON.stringify({
    choices: [
      {
        message: {
          content: JSON.stringify({
            parseStatus: 'success',
            totalCalories: 220,
            needReview: false,
            reviewReason: '',
            foodItems: [
              {
                rawText: '一个包子',
                name: '包子',
                quantity: 1,
                unit: '个',
                calories: 220,
                status: 'recognized',
                needReview: false,
                reviewReason: ''
              }
            ],
            waterItems: [],
            ignoredItems: []
          })
        }
      }
    ]
  }), { status: 200, headers: { 'content-type': 'application/json' } });

  try {
    const parser = createConfiguredParser({
      LLM_A_API_KEY: 'test-key',
      LLM_A_BASE_URL: 'https://api.moonshot.cn/v1',
      LLM_A_MODEL: 'moonshot-v1-8k',
      LLM_TIMEOUT_MS: '1000'
    });

    // Use a longer text to avoid fast_path, so decision logs are written
    const text = '我中午吃了一个包子，晚饭又吃了一个包子，还喝了一杯酸奶';
    await parser(text);

    const log = readFileSync(readableLogFile, 'utf8');
    assert.match(log, /Kimi 解析成功/);
    assert.match(log, /识别.*食物.*饮水/);
    assert.match(log, /总热量.*kcal/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalReadableLogFile === undefined) {
      delete process.env.LLM_READABLE_LOG_FILE;
    } else {
      process.env.LLM_READABLE_LOG_FILE = originalReadableLogFile;
    }
  }
});

test('writes readable decision notes when the judge model is used', async () => {
  const originalFetch = globalThis.fetch;
  const originalReadableLogFile = process.env.LLM_READABLE_LOG_FILE;
  const readableLogFile = join(mkdtempSync(join(tmpdir(), 'diet-readable-')), 'llm-readable.log');
  const requests = [];
  process.env.LLM_READABLE_LOG_FILE = readableLogFile;

  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    const calories = body.model === 'judge-model' ? 220 : body.model === 'model-a' ? 100 : 400;

    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              parseStatus: 'success',
              totalCalories: calories,
              needReview: false,
              reviewReason: '',
              foodItems: [
                {
                  rawText: 'xyz测试foodA xyz测试foodB',
                  name: 'xyz测试foodA',
                  quantity: 1,
                  unit: '份',
                  calories,
                  status: 'recognized',
                  needReview: false,
                  reviewReason: ''
                },
                {
                  rawText: 'xyz测试foodB',
                  name: 'xyz测试foodB',
                  quantity: 1,
                  unit: '份',
                  calories: 0,
                  status: 'recognized',
                  needReview: false,
                  reviewReason: ''
                }
              ],
              waterItems: [],
              ignoredItems: []
            })
          }
        }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const parser = createConfiguredParser({
      LLM_A_API_KEY: 'test-key',
      LLM_A_BASE_URL: 'https://api.example.com/v1',
      LLM_A_MODEL: 'model-a',
      LLM_B_API_KEY: 'test-key',
      LLM_B_BASE_URL: 'https://api.example.com/v1',
      LLM_B_MODEL: 'model-b',
      LLM_C_API_KEY: 'test-key',
      LLM_C_BASE_URL: 'https://api.example.com/v1',
      LLM_C_MODEL: 'judge-model',
      LLM_TIMEOUT_MS: '1000'
    });

    await parser('xyz测试foodA xyz测试foodB xyz测试foodC xyz测试foodD');

    const log = readFileSync(readableLogFile, 'utf8');
    assert.equal(requests.length, 3);
    const judgeRequest = requests.find(request => request.model === 'judge-model');
    const judgePrompt = judgeRequest.messages.at(-1).content;
    assert.match(judgePrompt, /A 总热量：100 kcal/);
    assert.match(judgePrompt, /B 总热量：400 kcal/);
    assert.match(judgePrompt, /calories=100/);
    assert.match(judgePrompt, /calories=400/);
    assert.match(log, /第一轮完成/);
    assert.match(log, /调用裁判模型/);
    assert.match(log, /裁判/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalReadableLogFile === undefined) {
      delete process.env.LLM_READABLE_LOG_FILE;
    } else {
      process.env.LLM_READABLE_LOG_FILE = originalReadableLogFile;
    }
  }
});

test('disables thinking and omits temperature for Kimi K2 requests', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              parseStatus: 'success',
              totalCalories: 220,
              needReview: false,
              reviewReason: '',
              foodItems: [
                {
                  rawText: '一个包子',
                  name: '包子',
                  quantity: 1,
                  unit: '个',
                  calories: 220,
                  status: 'recognized',
                  needReview: false,
                  reviewReason: ''
                }
              ],
              waterItems: [],
              ignoredItems: []
            })
          }
        }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const parser = createConfiguredParser({
      LLM_A_API_KEY: 'test-key',
      LLM_A_BASE_URL: 'https://api.moonshot.cn/v1',
      LLM_A_MODEL: 'kimi-k2.6',
      LLM_TIMEOUT_MS: '1000'
    });

    const result = await parser('一个包子，两个鸡蛋，一杯牛奶，一份沙拉，一碗米饭');

    assert.deepEqual(requestBody.thinking, { type: 'disabled' });
    assert.equal('temperature' in requestBody, false);
    assert.equal(result.parseSource, 'single_model_fallback');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('disables thinking for DeepSeek V4 requests', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  parseCache.clear();
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              parseStatus: 'success',
              totalCalories: 220,
              needReview: false,
              reviewReason: '',
              foodItems: [
                {
                  rawText: '一个包子',
                  name: '包子',
                  quantity: 1,
                  unit: '个',
                  calories: 220,
                  status: 'recognized',
                  needReview: false,
                  reviewReason: ''
                }
              ],
              waterItems: [],
              ignoredItems: []
            })
          }
        }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const parser = createConfiguredParser({
      LLM_B_API_KEY: 'test-key',
      LLM_B_BASE_URL: 'https://api.deepseek.com',
      LLM_B_MODEL: 'deepseek-v4-flash',
      LLM_TIMEOUT_MS: '1000'
    });

    await parser('一个包子');

    assert.deepEqual(requestBody.thinking, { type: 'disabled' });
    assert.equal(requestBody.temperature, 0.1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('judge model request does not have thinking disabled', async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);

    // A 和 B 返回不同的食物列表，强制裁判介入
    const isModelA = body.model === 'model-a';
    const calories = body.model === 'judge-model' ? 220 : isModelA ? 100 : 400;
    const foodName = isModelA ? '包子' : '茶叶蛋';
    return new Response(JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              parseStatus: 'success',
              totalCalories: calories,
              needReview: false,
              reviewReason: '',
              foodItems: [
                {
                  rawText: isModelA ? '一个包子' : '两个茶叶蛋',
                  name: foodName,
                  quantity: isModelA ? 1 : 2,
                  unit: '个',
                  calories,
                  status: 'recognized',
                  needReview: false,
                  reviewReason: ''
                }
              ],
              waterItems: [],
              ignoredItems: []
            })
          }
        }
      ]
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const parser = createConfiguredParser({
      LLM_A_API_KEY: 'test-key',
      LLM_A_BASE_URL: 'https://api.example.com/v1',
      LLM_A_MODEL: 'model-a',
      LLM_B_API_KEY: 'test-key',
      LLM_B_BASE_URL: 'https://api.example.com/v1',
      LLM_B_MODEL: 'model-b',
      LLM_C_API_KEY: 'test-key',
      LLM_C_BASE_URL: 'https://api.example.com/v1',
      LLM_C_MODEL: 'judge-model',
      LLM_TIMEOUT_MS: '1000'
    });

    const result = await parser('一份测试食品，两个鸡蛋，一杯牛奶，一碗米饭，一份沙拉，两个包子');
    const judgeRequest = requests.find(request => request.model === 'judge-model');

    // 裁判被调用（judge_model 或 judge_review 都代表裁判参与了）
    assert.match(result.parseSource, /^judge_/);
    assert.equal(judgeRequest.thinking, undefined);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
