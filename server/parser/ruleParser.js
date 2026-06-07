import { applyFoodLibrary, findFood } from './foodLibrary.js';

const UNITS = ['毫升', 'ml', '克', '个', '块', '盒', '包', '瓶', '杯', '碗', '根', '片', '袋', 'g'];
const NUMBER_WORDS = new Map([
  ['一', 1],
  ['一个', 1],
  ['一些', 1],
  ['两', 2],
  ['两个', 2],
  ['二', 2],
  ['半', 0.5],
  ['半个', 0.5]
]);

function normalizeText(text) {
  return String(text || '')
    .trim()
    .replace(/[，。；、]/g, ',')
    .replace(/和/g, ',')
    .replace(/\s+/g, ',')
    .replace(/,+/g, ',');
}

function splitSegments(text) {
  const normalized = normalizeText(text);
  const withBreaks = normalized.replace(/(\d+|一个|两个|一|两|半个|半)(?=[^,])/g, ',$1');
  return withBreaks.split(',').map(segment => segment.trim()).filter(Boolean);
}

function readQuantity(segment) {
  const numberMatch = segment.match(/^(\d+(?:\.\d+)?)/);
  if (numberMatch) return { quantity: Number(numberMatch[1]), rest: segment.slice(numberMatch[1].length) };

  for (const [word, value] of [...NUMBER_WORDS.entries()].sort((a, b) => b[0].length - a[0].length)) {
    if (segment.startsWith(word)) {
      return { quantity: value, rest: segment.slice(word.length) };
    }
  }
  return { quantity: 1, rest: segment };
}

function readUnit(rest) {
  const unit = UNITS.find(candidate => rest.toLowerCase().startsWith(candidate));
  if (!unit) return { unit: '', name: rest };
  return { unit, name: rest.slice(unit.length) };
}

function parseWater(segment, quantity, unit, name) {
  if (!/水|茶|咖啡/.test(segment) && !['ml', '毫升'].includes(unit.toLowerCase())) return null;
  if (['ml', '毫升'].includes(unit.toLowerCase())) {
    return {
      rawText: segment,
      amountMl: Math.round(quantity),
      status: 'recognized',
      needReview: false,
      reviewReason: ''
    };
  }
  if (unit === '瓶') {
    return {
      rawText: segment,
      amountMl: Math.round(quantity * 500),
      status: 'estimated',
      needReview: true,
      reviewReason: '按常见瓶装水估算为 500ml'
    };
  }
  if (unit === '杯') {
    return {
      rawText: segment,
      amountMl: Math.round(quantity * 250),
      status: 'estimated',
      needReview: true,
      reviewReason: '按常见杯装水估算为 250ml'
    };
  }
  return name.includes('水') ? {
    rawText: segment,
    amountMl: 250,
    status: 'estimated',
    needReview: true,
    reviewReason: '未明确饮水量，暂按 250ml 估算'
  } : null;
}

export function ruleBasedParse(text) {
  const foodItems = [];
  const waterItems = [];
  const ignoredItems = [];

  for (const segment of splitSegments(text)) {
    const cleaned = segment.replace(/^(我)?(喝了?|吃了?)|^又|^还/g, '');
    const { quantity, rest } = readQuantity(cleaned);
    const directFood = findFood(rest);
    const parsedUnit = directFood ? { unit: directFood.defaultUnit, name: directFood.name } : readUnit(rest);
    const { unit, name } = parsedUnit;
    const normalizedName = name.replace(/了|的/g, '').trim();

    const water = parseWater(cleaned, quantity, unit, normalizedName);
    if (water) {
      waterItems.push(water);
      continue;
    }

    const food = findFood(normalizedName);
    if (food) {
      foodItems.push({
        rawText: segment,
        name: food.name,
        quantity,
        unit: unit || food.defaultUnit,
        calories: 0,
        status: 'estimated',
        needReview: true,
        reviewReason: '规则引擎兜底解析，建议确认',
        source: 'rule_fallback'
      });
    } else if (normalizedName) {
      ignoredItems.push(segment);
    }
  }

  const covered = applyFoodLibrary({
    parseStatus: foodItems.length || waterItems.length ? 'partial' : 'empty',
    totalCalories: 0,
    needReview: true,
    reviewReason: '规则引擎兜底解析，建议确认',
    foodItems,
    waterItems,
    ignoredItems
  });

  return {
    ...covered,
    totalCalories: covered.finalTotalCalories,
    parseSource: 'rule_fallback'
  };
}
