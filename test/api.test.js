import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDatabase } from '../server/db.js';
import { createRepository } from '../server/repository.js';
import { createApp } from '../server/app.js';

async function startTestServer(parser) {
  const db = createDatabase(':memory:');
  const repo = createRepository(db);
  const server = createApp(repo, parser);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

test('POST /api/food-entries records food and water from text', async () => {
  const server = await startTestServer();
  try {
    const response = await fetch(`${server.baseUrl}/api/food-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个包子，2个鸡蛋，喝了一瓶水' })
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.equal(body.finalTotalCalories, 360);
    assert.equal(body.foodItems.length, 2);
    assert.equal(body.waterItems.length, 1);

    const summaryResponse = await fetch(`${server.baseUrl}/api/daily-summary?date=${body.recordedAt.slice(0, 10)}`);
    const summary = await summaryResponse.json();
    assert.equal(summary.totalCalories, 360);
    assert.equal(summary.waterTotalMl, 500);
  } finally {
    await server.close();
  }
});

test('PUT /api/food-entries/confirm clears review flags for the selected date', async () => {
  const parser = async () => ({
    parseSource: 'rule_fallback',
    parseStatus: 'partial',
    llmTotalCalories: 0,
    finalTotalCalories: 220,
    needReview: true,
    reviewReason: '建议确认',
    ignoredItems: [],
    foodItems: [
      { rawText: '一个包子', name: '包子', quantity: 1, unit: '个', calories: 220, status: 'estimated', needReview: true, reviewReason: '规则估算', source: 'rule' }
    ],
    waterItems: [
      { rawText: '一杯水', amountMl: 250, status: 'estimated', needReview: true, reviewReason: '规则估算' }
    ]
  });
  const server = await startTestServer(parser);
  try {
    const createResponse = await fetch(`${server.baseUrl}/api/food-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个包子，一杯水' })
    });
    const entry = await createResponse.json();
    const date = entry.recordedAt.slice(0, 10);

    const confirmResponse = await fetch(`${server.baseUrl}/api/food-entries/confirm`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date })
    });
    const confirmBody = await confirmResponse.json();
    assert.equal(confirmResponse.status, 200);
    assert.equal(confirmBody.confirmed, 1);

    const entriesResponse = await fetch(`${server.baseUrl}/api/food-entries?date=${date}`);
    const entries = await entriesResponse.json();
    assert.equal(entries[0].needReview, false);
    assert.equal(entries[0].foodItems[0].needReview, false);
    assert.equal(entries[0].waterItems[0].needReview, false);
  } finally {
    await server.close();
  }
});

test('GET /api/daily-summaries returns one row per day in the selected range', async () => {
  const server = await startTestServer();
  try {
    const createResponse = await fetch(`${server.baseUrl}/api/food-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个包子，喝了一瓶水' })
    });
    const entry = await createResponse.json();
    const date = entry.recordedAt.slice(0, 10);

    const response = await fetch(`${server.baseUrl}/api/daily-summaries?start=${date}&end=${date}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.length, 1);
    assert.equal(body[0].date, date);
    assert.equal(body[0].totalCalories, 220);
    assert.equal(body[0].waterTotalMl, 500);
  } finally {
    await server.close();
  }
});

test('POST and GET /api/weight-entries persist body weight for BMI trends', async () => {
  const server = await startTestServer();
  try {
    const saveResponse = await fetch(`${server.baseUrl}/api/weight-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '2026-06-05', weightKg: 61.2 })
    });
    const saved = await saveResponse.json();
    assert.equal(saveResponse.status, 201);
    assert.equal(saved.weightKg, 61.2);

    const secondSaveResponse = await fetch(`${server.baseUrl}/api/weight-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '2026-06-05', weightKg: 62.2, recordedAt: '2026-06-05T15:00:00+08:00' })
    });
    const averaged = await secondSaveResponse.json();
    assert.equal(secondSaveResponse.status, 201);
    assert.equal(averaged.weightKg, 61.7);

    const listResponse = await fetch(`${server.baseUrl}/api/weight-entries?start=2026-06-01&end=2026-06-07`);
    const rows = await listResponse.json();
    assert.equal(listResponse.status, 200);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].date, '2026-06-05');
    assert.equal(rows[0].weightKg, 61.7);

    const summaryResponse = await fetch(`${server.baseUrl}/api/daily-summary?date=2026-06-05`);
    const summary = await summaryResponse.json();
    assert.equal(summary.weightKg, 61.7);
  } finally {
    await server.close();
  }
});

test('POST /api/weight-entries uses recordedAt date over body date', async () => {
  const server = await startTestServer();
  try {
    const saveResponse = await fetch(`${server.baseUrl}/api/weight-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '2026-06-01', weightKg: 55, recordedAt: '2026-06-03T08:00:00+08:00' })
    });
    const saved = await saveResponse.json();
    assert.equal(saveResponse.status, 201);
    assert.equal(saved.date, '2026-06-03');

    const wrongDayResponse = await fetch(`${server.baseUrl}/api/daily-summary?date=2026-06-01`);
    const wrongDay = await wrongDayResponse.json();
    assert.equal(wrongDay.weightKg, null);

    const selectedDayResponse = await fetch(`${server.baseUrl}/api/daily-summary?date=2026-06-03`);
    const selectedDay = await selectedDayResponse.json();
    assert.equal(selectedDay.weightKg, 55);
  } finally {
    await server.close();
  }
});

test('POST endpoints use the selected recordedAt for backfilled records', async () => {
  const server = await startTestServer();
  try {
    const recordedAt = '2026-06-01T12:34:56+08:00';
    const createResponse = await fetch(`${server.baseUrl}/api/food-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个包子', recordedAt })
    });
    const entry = await createResponse.json();
    assert.equal(createResponse.status, 201);
    assert.equal(entry.recordedAt, recordedAt);

    const waterResponse = await fetch(`${server.baseUrl}/api/water-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amountMl: 300, recordedAt })
    });
    const water = await waterResponse.json();
    assert.equal(waterResponse.status, 201);
    assert.equal(water.recordedAt, recordedAt);

    const summaryResponse = await fetch(`${server.baseUrl}/api/daily-summary?date=2026-06-01`);
    const summary = await summaryResponse.json();
    assert.equal(summary.totalCalories, 220);
    assert.equal(summary.waterTotalMl, 300);
  } finally {
    await server.close();
  }
});

test('POST /api/food-entries/preview parses without saving until confirmed', async () => {
  const server = await startTestServer();
  try {
    const recordedAt = '2026-06-03T08:30:00+08:00';
    const previewResponse = await fetch(`${server.baseUrl}/api/food-entries/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个包子，喝了一瓶水', recordedAt })
    });
    const preview = await previewResponse.json();
    assert.equal(previewResponse.status, 200);
    assert.equal(preview.foodItems.length, 1);
    assert.equal(preview.waterItems.length, 1);

    const emptySummaryResponse = await fetch(`${server.baseUrl}/api/daily-summary?date=2026-06-03`);
    const emptySummary = await emptySummaryResponse.json();
    assert.equal(emptySummary.totalCalories, 0);
    assert.equal(emptySummary.waterTotalMl, 0);

    const saveResponse = await fetch(`${server.baseUrl}/api/food-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: preview.rawText, recordedAt, parsed: preview })
    });
    const saved = await saveResponse.json();
    assert.equal(saveResponse.status, 201);
    assert.equal(saved.finalTotalCalories, 220);

    const savedSummaryResponse = await fetch(`${server.baseUrl}/api/daily-summary?date=2026-06-03`);
    const savedSummary = await savedSummaryResponse.json();
    assert.equal(savedSummary.totalCalories, 220);
    assert.equal(savedSummary.waterTotalMl, 500);
  } finally {
    await server.close();
  }
});

test('POST /api/food-entries/recalculate recalculates calories from edited food names', async () => {
  const server = await startTestServer(async () => ({
    parseSource: 'dual_model',
    parseStatus: 'success',
    llmTotalCalories: 120,
    finalTotalCalories: 120,
    needReview: false,
    reviewReason: '',
    ignoredItems: [],
    foodItems: [
      { rawText: '一个不明蛋', name: '不明蛋', quantity: 1, unit: '个', calories: 120, status: 'recognized', needReview: false, reviewReason: '', source: 'llm' }
    ],
    waterItems: []
  }));
  try {
    const previewResponse = await fetch(`${server.baseUrl}/api/food-entries/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个不明蛋' })
    });
    const preview = await previewResponse.json();
    preview.foodItems[0].name = '鸡蛋';

    const recalcResponse = await fetch(`${server.baseUrl}/api/food-entries/recalculate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parsed: preview })
    });
    const recalculated = await recalcResponse.json();

    assert.equal(recalcResponse.status, 200);
    assert.equal(recalculated.foodItems[0].name, '鸡蛋');
    assert.equal(recalculated.foodItems[0].calories, 70);
    assert.equal(recalculated.foodItems[0].source, 'food_library');
    assert.equal(recalculated.finalTotalCalories, 70);
  } finally {
    await server.close();
  }
});

test('POST /api/food-entries/recalculate uses parser fallback when food library misses', async () => {
  let parserCalls = 0;
  const server = await startTestServer(async text => {
    parserCalls += 1;
    const isFallback = text.includes('modelonlyfoodxyz');

    return {
      parseSource: isFallback ? 'dual_model' : 'preview_model',
      parseStatus: 'success',
      llmTotalCalories: isFallback ? 333 : 111,
      finalTotalCalories: isFallback ? 333 : 111,
      needReview: false,
      reviewReason: '',
      ignoredItems: [],
      foodItems: [
        {
          rawText: text,
          name: isFallback ? 'modelonlyfoodxyz' : 'unknown food',
          quantity: 1,
          unit: 'serving',
          calories: isFallback ? 333 : 111,
          status: 'recognized',
          needReview: false,
          reviewReason: '',
          source: 'llm'
        }
      ],
      waterItems: []
    };
  });

  try {
    const previewResponse = await fetch(`${server.baseUrl}/api/food-entries/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'unknown food' })
    });
    const preview = await previewResponse.json();
    preview.foodItems[0].name = 'modelonlyfoodxyz';

    const recalcResponse = await fetch(`${server.baseUrl}/api/food-entries/recalculate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ parsed: preview })
    });
    const recalculated = await recalcResponse.json();

    assert.equal(recalcResponse.status, 200);
    assert.equal(parserCalls, 2);
    assert.equal(recalculated.foodItems[0].name, 'modelonlyfoodxyz');
    assert.equal(recalculated.foodItems[0].calories, 333);
    assert.equal(recalculated.foodItems[0].source, 'llm_fallback');
    assert.equal(recalculated.foodItems[0].needReview, true);
    assert.equal(recalculated.finalTotalCalories, 333);
  } finally {
    await server.close();
  }
});

test('POST /api/food-entries/preview passes repo and preserves review flags', async () => {
  let sawRepo = false;
  const parser = async (_text, repo) => {
    sawRepo = Boolean(repo?.logParseResult);
    return {
      parseSource: 'judge_review',
      parseStatus: 'success',
      llmTotalCalories: 95,
      finalTotalCalories: 95,
      needReview: true,
      reviewReason: 'judge review',
      ignoredItems: [],
      foodItems: [
        {
          rawText: 'test food',
          name: 'test food',
          quantity: 1,
          unit: '份',
          calories: 95,
          status: 'estimated',
          needReview: true,
          reviewReason: 'uncertain calories',
          source: 'judge_review'
        }
      ],
      waterItems: []
    };
  };
  const server = await startTestServer(parser);
  try {
    const response = await fetch(`${server.baseUrl}/api/food-entries/preview`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'test food' })
    });
    const preview = await response.json();

    assert.equal(response.status, 200);
    assert.equal(sawRepo, true);
    assert.equal(preview.needReview, true);
    assert.equal(preview.reviewReason, 'judge review');
    assert.equal(preview.foodItems[0].needReview, true);
    assert.equal(preview.foodItems[0].reviewReason, 'uncertain calories');
  } finally {
    await server.close();
  }
});

test('DELETE endpoints remove food items, food entries, and water entries', async () => {
  const server = await startTestServer();
  try {
    const createResponse = await fetch(`${server.baseUrl}/api/food-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个包子，2个鸡蛋，喝了一瓶水' })
    });
    const entry = await createResponse.json();
    const date = entry.recordedAt.slice(0, 10);

    const deleteItemResponse = await fetch(`${server.baseUrl}/api/food-items/${entry.foodItems[1].id}`, { method: 'DELETE' });
    const itemDeletedEntry = await deleteItemResponse.json();
    assert.equal(deleteItemResponse.status, 200);
    assert.equal(itemDeletedEntry.finalTotalCalories, 220);
    assert.equal(itemDeletedEntry.foodItems.length, 1);

    const waterResponse = await fetch(`${server.baseUrl}/api/water-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ amountMl: 300 })
    });
    const water = await waterResponse.json();
    const deleteWaterResponse = await fetch(`${server.baseUrl}/api/water-entries/${water.id}`, { method: 'DELETE' });
    const deletedWater = await deleteWaterResponse.json();
    assert.equal(deleteWaterResponse.status, 200);
    assert.equal(deletedWater.deleted, true);

    const deleteEntryResponse = await fetch(`${server.baseUrl}/api/food-entries/${entry.id}`, { method: 'DELETE' });
    const deletedEntry = await deleteEntryResponse.json();
    assert.equal(deleteEntryResponse.status, 200);
    assert.equal(deletedEntry.deleted, true);

    const summaryResponse = await fetch(`${server.baseUrl}/api/daily-summary?date=${date}`);
    const summary = await summaryResponse.json();
    assert.equal(summary.totalCalories, 0);
    assert.equal(summary.waterTotalMl, 0);
  } finally {
    await server.close();
  }
});

test('DELETE /api/all-data clears local records and learned aliases', async () => {
  const db = createDatabase(':memory:');
  const repo = createRepository(db);
  const serverInstance = createApp(repo, async () => ({
    parseSource: 'dual_model',
    parseStatus: 'success',
    llmTotalCalories: 220,
    finalTotalCalories: 220,
    needReview: false,
    reviewReason: '',
    ignoredItems: [],
    foodItems: [
      { rawText: '一个包子', name: '包子', quantity: 1, unit: '个', calories: 220, status: 'recognized', needReview: false, reviewReason: '', source: 'llm' }
    ],
    waterItems: [
      { rawText: '一瓶水', amountMl: 500, status: 'recognized', needReview: false, reviewReason: '' }
    ]
  }));
  await new Promise(resolve => serverInstance.listen(0, '127.0.0.1', resolve));
  const { port } = serverInstance.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await fetch(`${baseUrl}/api/food-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个包子，喝水', recordedAt: '2026-06-02T09:00:00+08:00' })
    });
    await fetch(`${baseUrl}/api/weight-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ date: '2026-06-02', weightKg: 60.5, recordedAt: '2026-06-02T09:00:00+08:00' })
    });

    const clearResponse = await fetch(`${baseUrl}/api/all-data`, { method: 'DELETE' });
    const clearBody = await clearResponse.json();
    assert.equal(clearResponse.status, 200);
    assert.equal(clearBody.cleared, true);

    const summaryResponse = await fetch(`${baseUrl}/api/daily-summary?date=2026-06-02`);
    const summary = await summaryResponse.json();
    assert.equal(summary.totalCalories, 0);
    assert.equal(summary.waterTotalMl, 0);
    assert.equal(summary.weightKg, null);

    const aliasesResponse = await fetch(`${baseUrl}/api/food-aliases`);
    const aliases = await aliasesResponse.json();
    assert.equal(aliases.length, 0);
  } finally {
    await new Promise(resolve => serverInstance.close(resolve));
  }
});

test('GET and DELETE /api/food-aliases expose the learned alias store', async () => {
  const db = createDatabase(':memory:');
  const repo = createRepository(db);
  const serverInstance = createApp(repo, async () => ({
    parseSource: 'dual_model',
    parseStatus: 'success',
    llmTotalCalories: 95,
    finalTotalCalories: 95,
    needReview: false,
    reviewReason: '',
    ignoredItems: [],
    foodItems: [
      { rawText: '一个煎蛋', name: '鸡蛋', quantity: 1, unit: '个', calories: 95, status: 'recognized', needReview: false, reviewReason: '', source: 'llm' }
    ],
    waterItems: []
  }));
  await new Promise(resolve => serverInstance.listen(0, '127.0.0.1', resolve));
  const { port } = serverInstance.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await fetch(`${baseUrl}/api/food-entries`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '一个煎蛋' })
    });

    const aliasesResponse = await fetch(`${baseUrl}/api/food-aliases`);
    const aliases = await aliasesResponse.json();
    assert.equal(aliasesResponse.status, 200);
    assert.equal(aliases[0].alias, '煎蛋');

    const clearResponse = await fetch(`${baseUrl}/api/food-aliases`, { method: 'DELETE' });
    const clearBody = await clearResponse.json();
    assert.equal(clearResponse.status, 200);
    assert.equal(clearBody.cleared, true);

    const emptyResponse = await fetch(`${baseUrl}/api/food-aliases`);
    const emptyAliases = await emptyResponse.json();
    assert.equal(emptyAliases.length, 0);
  } finally {
    await new Promise(resolve => serverInstance.close(resolve));
  }
});
