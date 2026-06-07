import assert from 'node:assert/strict';
import { test } from 'node:test';

import { validateLLMResult } from '../server/parser/schema.js';
import { ruleBasedParse } from '../server/parser/ruleParser.js';
import { compareFinalCalories, parseWithModels } from '../server/parser/orchestrator.js';
import { applyFoodLibrary, getCalorieRange } from '../server/parser/foodLibrary.js';

test('validates the fixed LLM JSON contract', () => {
  const result = validateLLMResult({
    parseStatus: 'success',
    totalCalories: 360,
    needReview: false,
    reviewReason: '',
    foodItems: [
      {
        rawText: '2个鸡蛋',
        name: '鸡蛋',
        quantity: 2,
        unit: '个',
        calories: 140,
        status: 'recognized',
        needReview: false,
        reviewReason: ''
      }
    ],
    waterItems: [
      {
        rawText: '一瓶水',
        amountMl: 500,
        status: 'estimated',
        needReview: true,
        reviewReason: '按常见瓶装水估算为 500ml'
      }
    ],
    ignoredItems: []
  });

  assert.equal(result.ok, true);
  assert.equal(result.value.foodItems[0].name, '鸡蛋');
  assert.equal(result.value.waterItems[0].amountMl, 500);
});

test('rejects an LLM result outside the fixed contract', () => {
  const result = validateLLMResult({
    parseStatus: 'success',
    totalCalories: '360',
    needReview: false,
    reviewReason: '',
    foodItems: [],
    waterItems: [],
    ignoredItems: []
  });

  assert.equal(result.ok, false);
});

test('rule fallback parses common food and keeps water separate', () => {
  const parsed = ruleBasedParse('一个包子，2个鸡蛋，喝了一瓶水');

  assert.equal(parsed.parseStatus, 'partial');
  assert.equal(parsed.foodItems.length, 2);
  assert.equal(parsed.foodItems[0].name, '包子');
  assert.equal(parsed.foodItems[1].quantity, 2);
  assert.equal(parsed.waterItems.length, 1);
  assert.equal(parsed.waterItems[0].amountMl, 500);
  assert.equal(parsed.totalCalories, 360);
});

test('rule fallback parses mixed foods joined by Chinese conjunctions', () => {
  const parsed = ruleBasedParse('我吃了一碗小米粥，一个水煮蛋，一些鱼肉和虾条和一个奥利奥');

  assert.equal(parsed.parseStatus, 'partial');
  assert.deepEqual(parsed.foodItems.map(item => item.name), ['小米粥', '鸡蛋', '鱼肉', '虾条', '奥利奥']);
  assert.equal(parsed.finalTotalCalories, 334);
  assert.equal(parsed.ignoredItems.length, 0);
});

test('food library converts ml drinks before applying per-portion calories', () => {
  const covered = applyFoodLibrary({
    foodItems: [
      { rawText: '260ml 牛奶', name: '牛奶', quantity: 260, unit: 'ml', calories: 0, status: 'recognized', needReview: false, reviewReason: '', source: 'llm' }
    ],
    waterItems: [],
    ignoredItems: []
  });

  assert.equal(covered.foodItems[0].calories, 156);
  assert.equal(covered.finalTotalCalories, 156);
});

test('calorie range converts ml drinks before validation', () => {
  const range = getCalorieRange('牛奶', 'ml', 260);

  assert.deepEqual(range, {
    min: 140,
    max: 187,
    perUnit: 150,
    source: 'precise'
  });
});

test('compares model results without food-library calorie coverage', () => {
  const modelA = validateLLMResult({
    parseStatus: 'success',
    totalCalories: 500,
    needReview: false,
    reviewReason: '',
    foodItems: [
      { rawText: '一个包子', name: '包子', quantity: 1, unit: '个', calories: 180, status: 'recognized', needReview: false, reviewReason: '' },
      { rawText: '2个鸡蛋', name: '鸡蛋', quantity: 2, unit: '个', calories: 320, status: 'estimated', needReview: true, reviewReason: '模型估算偏高' }
    ],
    waterItems: [],
    ignoredItems: []
  }).value;
  const modelB = validateLLMResult({
    parseStatus: 'success',
    totalCalories: 370,
    needReview: false,
    reviewReason: '',
    foodItems: [
      { rawText: '一个包子', name: '包子', quantity: 1, unit: '个', calories: 220, status: 'recognized', needReview: false, reviewReason: '' },
      { rawText: '2个鸡蛋', name: '鸡蛋', quantity: 2, unit: '个', calories: 150, status: 'recognized', needReview: false, reviewReason: '' }
    ],
    waterItems: [],
    ignoredItems: []
  }).value;

  const comparison = compareFinalCalories(modelA, modelB);

  assert.equal(comparison.matches, false);
  assert.equal(comparison.a.finalTotalCalories, 500);
  assert.equal(comparison.b.finalTotalCalories, 370);
});

test('keeps LLM calories as final calories instead of overriding from food library', async () => {
  const result = await parseWithModels('一个煎蛋', {
    callModelA: async () => ({
      parseStatus: 'success',
      totalCalories: 95,
      needReview: false,
      reviewReason: '',
      foodItems: [
        { rawText: '一个煎蛋', name: '鸡蛋', quantity: 1, unit: '个', calories: 95, status: 'recognized', needReview: false, reviewReason: '' }
      ],
      waterItems: [],
      ignoredItems: []
    }),
    callModelB: async () => ({
      parseStatus: 'success',
      totalCalories: 95,
      needReview: false,
      reviewReason: '',
      foodItems: [
        { rawText: '一个煎蛋', name: '鸡蛋', quantity: 1, unit: '个', calories: 95, status: 'recognized', needReview: false, reviewReason: '' }
      ],
      waterItems: [],
      ignoredItems: []
    })
  });

  assert.equal(result.parseSource, 'consensus');
  assert.equal(result.foodItems[0].calories, 95);
  assert.equal(result.foodItems[0].source, 'llm');
  assert.equal(result.finalTotalCalories, 95);
  assert.equal(result.llmTotalCalories, 95);
});

test('uses single_model_effective when one model is empty and the other has food', async () => {
  const result = await parseWithModels('一个包子，2个鸡蛋', {
    callModelA: async () => ({
      parseStatus: 'empty',
      totalCalories: 0,
      needReview: true,
      reviewReason: '未识别到内容',
      foodItems: [],
      waterItems: [],
      ignoredItems: []
    }),
    callModelB: async () => ({
      parseStatus: 'success',
      totalCalories: 360,
      needReview: false,
      reviewReason: '',
      foodItems: [
        { rawText: '一个包子', name: '包子', quantity: 1, unit: '个', calories: 220, status: 'recognized', needReview: false, reviewReason: '' },
        { rawText: '2个鸡蛋', name: '鸡蛋', quantity: 2, unit: '个', calories: 140, status: 'recognized', needReview: false, reviewReason: '' }
      ],
      waterItems: [],
      ignoredItems: []
    })
  });

  assert.equal(result.parseSource, 'single_model_effective');
  assert.equal(result.needReview, true);
  assert.equal(result.finalTotalCalories, 360);
});
