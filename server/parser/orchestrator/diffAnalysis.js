import { fuzzyMatch } from './fuzzyMatch.js';
import { compareQuantityUnit } from './quantityCompare.js';
import { toJudgeHintItem } from './modelNormalize.js';
import { normalizeFoodName } from '../foodLibrary.js';

/**
 * A/B 双模型差异分析：计算食物/饮水重叠度、数量/单位/热量冲突，
 * 判定共识条件，并生成 A+B 合并结果。
 *
 * 共识条件（冻结版）：
 *   - 食物重叠度 ≥ threshold（≤3 项时 0.95，>3 项时 0.88）
 *   - 项数差 ≤ 1
 *   - 无数量/单位冲突
 *   - 无热量冲突
 *   - 饮水重叠度 ≥ 0.7 且饮水项数差 ≤ 1
 *
 * 合并策略：
 *   共同食物取 quantity/calories 的平均值；
 *   独有食物保留原值。
 */
export function buildDiffResult(modelA, modelB) {
  const aItems = modelA.foodItems.map(i => ({ ...i, _norm: normalizeFoodName(i.name) }));
  const bItems = modelB.foodItems.map(i => ({ ...i, _norm: normalizeFoodName(i.name) }));

  const aNames = [...new Set(aItems.map(i => i._norm))].filter(Boolean);
  const bNames = [...new Set(bItems.map(i => i._norm))].filter(Boolean);

  const commonFoods = [];
  const onlyInA = [];
  const onlyInB = [];

  for (const name of aNames) {
    if (bNames.some(bn => fuzzyMatch(name, bn))) commonFoods.push(name);
    else onlyInA.push(name);
  }
  for (const name of bNames) {
    if (!aNames.some(an => fuzzyMatch(an, name))) onlyInB.push(name);
  }

  const unionSize = new Set([...aNames, ...bNames]).size;
  const foodOverlap = unionSize > 0 ? commonFoods.length / unionSize : 0;
  const foodCountDiff = Math.abs(modelA.foodItems.length - modelB.foodItems.length);
  const maxCount = Math.max(modelA.foodItems.length, modelB.foodItems.length);

  // 饮水重叠度
  const aWaterTexts = modelA.waterItems.map(w => w.rawText);
  const bWaterTexts = modelB.waterItems.map(w => w.rawText);
  const commonWaters = aWaterTexts.filter(aw => bWaterTexts.some(bw => fuzzyMatch(aw, bw)));
  const waterUnion = new Set([...aWaterTexts, ...bWaterTexts]).size;
  const waterOverlap = waterUnion > 0 ? commonWaters.length / waterUnion : 1;
  const waterCountDiff = Math.abs(modelA.waterItems.length - modelB.waterItems.length);

  // 数量/单位冲突
  const quantityDiffs = [];
  for (const aItem of aItems) {
    const bItem = bItems.find(bi => fuzzyMatch(aItem._norm, bi._norm));
    if (bItem) {
      const cmp = compareQuantityUnit(aItem, bItem);
      if (!cmp.isMatch) {
        quantityDiffs.push({
          name: aItem.name,
          a: `${aItem.quantity}${aItem.unit}`,
          b: `${bItem.quantity}${bItem.unit}`,
          reason: cmp.reason
        });
      }
    }
  }

  // 热量冲突
  const calorieDiffs = [];
  for (const aItem of aItems) {
    const bItem = bItems.find(bi => fuzzyMatch(aItem._norm, bi._norm));
    if (bItem) {
      const diff = Math.abs(aItem.calories - bItem.calories);
      const avg = (aItem.calories + bItem.calories) / 2;
      if (diff > 50 && diff / avg > 0.25) {
        calorieDiffs.push({
          name: aItem.name,
          aCalories: aItem.calories,
          bCalories: bItem.calories,
          diffPercent: Math.round((diff / avg) * 100)
        });
      }
    }
  }

  const overlapThreshold = maxCount <= 3 ? 0.95 : 0.88;
  const hasQuantityConflict = quantityDiffs.length > 0;
  const hasCalorieConflict = calorieDiffs.length > 0;
  const hasWaterConflict = waterOverlap < 0.7 || waterCountDiff > 1;

  const consensus = foodOverlap >= overlapThreshold
    && foodCountDiff <= 1
    && !hasQuantityConflict
    && !hasCalorieConflict
    && !hasWaterConflict;

  // A+B 合并（共同食物取平均值）
  const mergedFood = [];
  const usedB = new Set();
  for (const aItem of aItems) {
    const bIdx = bItems.findIndex((bi, idx) => !usedB.has(idx) && fuzzyMatch(aItem._norm, bi._norm));
    if (bIdx >= 0) {
      usedB.add(bIdx);
      const bItem = bItems[bIdx];
      mergedFood.push({
        ...aItem,
        quantity: Math.round((aItem.quantity + bItem.quantity) / 2 * 10) / 10,
        calories: Math.round((aItem.calories + bItem.calories) / 2)
      });
    } else {
      mergedFood.push({ ...aItem });
    }
  }
  for (let i = 0; i < bItems.length; i++) {
    if (!usedB.has(i)) mergedFood.push({ ...bItems[i] });
  }

  const mergedWater = [];
  const usedW = new Set();
  for (const aItem of modelA.waterItems) {
    const bIdx = modelB.waterItems.findIndex((bi, idx) => !usedW.has(idx) && fuzzyMatch(aItem.rawText, bi.rawText));
    if (bIdx >= 0) {
      usedW.add(bIdx);
      mergedWater.push({
        ...aItem,
        amountMl: Math.round((aItem.amountMl + modelB.waterItems[bIdx].amountMl) / 2)
      });
    } else {
      mergedWater.push({ ...aItem });
    }
  }
  for (let i = 0; i < modelB.waterItems.length; i++) {
    if (!usedW.has(i)) mergedWater.push({ ...modelB.waterItems[i] });
  }

  return {
    consensus,
    foodOverlap: Math.round(foodOverlap * 100) / 100,
    waterOverlap: Math.round(waterOverlap * 100) / 100,
    overlapThreshold,
    foodCountDiff,
    waterCountDiff,
    hasQuantityConflict,
    hasCalorieConflict,
    hasWaterConflict,
    quantityDiffs,
    calorieDiffs,
    modelATotalCalories: modelA.finalTotalCalories,
    modelBTotalCalories: modelB.finalTotalCalories,
    modelAFoodItems: aItems.map(toJudgeHintItem),
    modelBFoodItems: bItems.map(toJudgeHintItem),
    foodNamesA: aNames,
    foodNamesB: bNames,
    commonFoods,
    onlyInA,
    onlyInB,
    mergedResult: {
      parseStatus: 'partial',
      totalCalories: mergedFood.reduce((s, i) => s + (Number(i.calories) || 0), 0),
      needReview: false,
      reviewReason: '',
      foodItems: mergedFood,
      waterItems: mergedWater,
      ignoredItems: Array.from(new Set([...(modelA.ignoredItems || []), ...(modelB.ignoredItems || [])]))
    }
  };
}