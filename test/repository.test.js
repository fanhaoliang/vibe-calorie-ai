import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createDatabase } from '../server/db.js';
import { createRepository } from '../server/repository.js';
import { ruleBasedParse } from '../server/parser/ruleParser.js';
import { resetRuntimeFoodAliases } from '../server/parser/foodLibrary.js';

test('saves food and water entries from one parsed text', () => {
  const db = createDatabase(':memory:');
  const repo = createRepository(db);

  const entry = repo.createFoodEntry('一个包子，喝了一瓶水', {
    parseSource: 'dual_model',
    parseStatus: 'success',
    llmTotalCalories: 220,
    finalTotalCalories: 220,
    needReview: false,
    reviewReason: '',
    ignoredItems: [],
    foodItems: [
      { rawText: '一个包子', name: '包子', quantity: 1, unit: '个', calories: 220, status: 'recognized', needReview: false, reviewReason: '', source: 'food_library' }
    ],
    waterItems: [
      { rawText: '一瓶水', amountMl: 500, status: 'estimated', needReview: true, reviewReason: '按常见瓶装水估算为 500ml' }
    ]
  });

  const day = repo.getDailySummary(entry.recordedAt.slice(0, 10));

  assert.equal(entry.finalTotalCalories, 220);
  assert.equal(entry.foodItems.length, 1);
  assert.equal(entry.waterItems.length, 1);
  assert.equal(day.totalCalories, 220);
  assert.equal(day.waterTotalMl, 500);
});

test('stores recorded_at with Asia Shanghai offset for local-day summaries', () => {
  const db = createDatabase(':memory:');
  const repo = createRepository(db);

  const entry = repo.createFoodEntry('一个包子', {
    parseSource: 'rule_fallback',
    parseStatus: 'partial',
    llmTotalCalories: 220,
    finalTotalCalories: 220,
    needReview: true,
    reviewReason: '规则引擎兜底解析，建议确认',
    ignoredItems: [],
    foodItems: [
      { rawText: '一个包子', name: '包子', quantity: 1, unit: '个', calories: 220, status: 'estimated', needReview: true, reviewReason: '规则引擎兜底解析，建议确认', source: 'food_library' }
    ],
    waterItems: []
  });

  assert.match(entry.recordedAt, /\+08:00$/);
  assert.equal(repo.getDailySummary(entry.recordedAt.slice(0, 10)).totalCalories, 220);
});

test('updating a food item recalculates the parent final total', () => {
  const db = createDatabase(':memory:');
  const repo = createRepository(db);

  const entry = repo.createFoodEntry('一包辣条', {
    parseSource: 'dual_model',
    parseStatus: 'success',
    llmTotalCalories: 300,
    finalTotalCalories: 300,
    needReview: false,
    reviewReason: '',
    ignoredItems: [],
    foodItems: [
      { rawText: '一包辣条', name: '辣条', quantity: 1, unit: '包', calories: 300, status: 'recognized', needReview: false, reviewReason: '', source: 'food_library' }
    ],
    waterItems: []
  });

  const updated = repo.updateFoodItemCalories(entry.foodItems[0].id, 450, false);
  const loaded = repo.getFoodEntry(entry.id);

  assert.equal(updated.finalTotalCalories, 450);
  assert.equal(loaded.finalTotalCalories, 450);
  assert.equal(loaded.foodItems[0].source, 'user_edit');
});

test('averages same-day weight entries and exposes daily averages in summaries', () => {
  const db = createDatabase(':memory:');
  const repo = createRepository(db);

  repo.saveWeightEntry(60.5, '2026-06-01');
  repo.saveWeightEntry(50, '2026-06-03', '2026-06-03T08:00:00+08:00');
  const updated = repo.saveWeightEntry(60, '2026-06-03', '2026-06-03T15:00:00+08:00');
  const rows = repo.getWeightEntries('2026-06-01', '2026-06-05');
  const summary = repo.getDailySummary('2026-06-04');

  assert.equal(updated.weightKg, 55);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].weightKg, 55);
  assert.equal(summary.weightKg, 55);
});

test('uses recordedAt date when saving weight entries', () => {
  const db = createDatabase(':memory:');
  const repo = createRepository(db);

  const saved = repo.saveWeightEntry(55, '2026-06-01', '2026-06-03T08:00:00+08:00');

  assert.equal(saved.date, '2026-06-03');
  assert.equal(repo.getDailySummary('2026-06-01').weightKg, null);
  assert.equal(repo.getDailySummary('2026-06-03').weightKg, 55);
});

test('auto learns model aliases for later rule fallback parsing', () => {
  resetRuntimeFoodAliases();
  const db = createDatabase(':memory:');
  const repo = createRepository(db);

  repo.createFoodEntry('一个煎蛋', {
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
  });

  const aliases = repo.getLearnedFoodAliases();
  const parsed = ruleBasedParse('一个煎蛋');

  assert.equal(aliases.length, 1);
  assert.equal(aliases[0].alias, '煎蛋');
  assert.equal(aliases[0].name, '鸡蛋');
  assert.equal(parsed.foodItems[0].name, '鸡蛋');
  assert.equal(parsed.finalTotalCalories, 95);
});

test('saved user foods become automatic parsing experience', () => {
  resetRuntimeFoodAliases();
  const db = createDatabase(':memory:');
  const repo = createRepository(db);

  const entry = repo.createFoodEntry('一包辣条', {
    parseSource: 'dual_model',
    parseStatus: 'success',
    llmTotalCalories: 300,
    finalTotalCalories: 300,
    needReview: false,
    reviewReason: '',
    ignoredItems: [],
    foodItems: [
      { rawText: '一包辣条', name: '辣条', quantity: 1, unit: '包', calories: 300, status: 'recognized', needReview: false, reviewReason: '', source: 'llm' }
    ],
    waterItems: []
  });

  repo.updateFoodItemCalories(entry.foodItems[0].id, 450, true);

  let parsed = ruleBasedParse('一包辣条');
  assert.equal(parsed.foodItems[0].source, 'user_library');
  assert.equal(parsed.finalTotalCalories, 450);

  const reloadedRepo = createRepository(db);
  parsed = ruleBasedParse('一包辣条');
  assert.equal(parsed.foodItems[0].source, 'user_library');
  assert.equal(parsed.finalTotalCalories, 450);

  reloadedRepo.clearLearnedFoodAliases();
  parsed = ruleBasedParse('一包辣条');
  assert.equal(parsed.foodItems[0].source, 'user_library');
  assert.equal(parsed.finalTotalCalories, 450);
});

test('prunes stale low-use learned aliases but keeps repeated ones', () => {
  resetRuntimeFoodAliases();
  const db = createDatabase(':memory:');
  db.prepare(`
    INSERT INTO food_aliases (
      alias, name, default_unit, calories_per_unit, confidence, source,
      use_count, last_used_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'auto', ?, ?, ?, ?, ?)
  `).run('旧低频蛋', '鸡蛋', '个', 70, 'auto_llm', 1, '2026-01-01T00:00:00+08:00', '2026-01-01T00:00:00+08:00', '2026-01-01T00:00:00+08:00');
  db.prepare(`
    INSERT INTO food_aliases (
      alias, name, default_unit, calories_per_unit, confidence, source,
      use_count, last_used_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 'auto', ?, ?, ?, ?, ?)
  `).run('旧高频蛋', '鸡蛋', '个', 70, 'auto_llm', 2, '2026-01-01T00:00:00+08:00', '2026-01-01T00:00:00+08:00', '2026-01-01T00:00:00+08:00');

  const repo = createRepository(db);
  const aliases = repo.getLearnedFoodAliases().map(alias => alias.alias);

  assert.equal(aliases.includes('旧低频蛋'), false);
  assert.equal(aliases.includes('旧高频蛋'), true);
});
