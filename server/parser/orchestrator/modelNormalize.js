import { validateLLMResult } from '../schema.js';

/**
 * 模型结果校验与标准化工具。
 *
 * validateModelPayload → 对 LLM 返回的原始 JSON 做 schema 校验
 * hasContent           → 是否有至少一条 food 或 water
 * normalizeModelFoodItems → 清理 _norm 残留、clamp 热量、补 default source
 * sumFoodCalories      → 对 foodItems 求和
 * toJudgeHintItem      → 裁判 hint 可读格式化
 * finalize             → 算 finalTotalCalories 并固定 parseSource
 * markAllNeedReview    → 递归标记整个树需确认
 */
export function validateModelPayload(payload) {
  const result = validateLLMResult(payload);
  return result.ok ? result.value : null;
}

export function hasContent(result) {
  return result && (result.foodItems.length > 0 || result.waterItems.length > 0);
}

export function normalizeModelFoodItems(items = [], defaultSource = 'llm') {
  return items.map(({ _norm, ...item }) => ({
    ...item,
    calories: Math.max(0, Math.round(Number(item.calories) || 0)),
    source: item.source || defaultSource
  }));
}

export function sumFoodCalories(items = []) {
  return normalizeModelFoodItems(items).reduce((sum, item) => sum + item.calories, 0);
}

export function toJudgeHintItem(item) {
  return {
    rawText: item.rawText || '',
    name: item.name || '',
    quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
    unit: item.unit || '',
    calories: Math.max(0, Math.round(Number(item.calories) || 0)),
    status: item.status || 'recognized'
  };
}

export function finalize(result, parseSource) {
  const foodItems = normalizeModelFoodItems(result.foodItems);
  const finalTotalCalories = sumFoodCalories(foodItems);
  return {
    ...result,
    foodItems,
    parseSource,
    llmTotalCalories: result.totalCalories,
    finalTotalCalories
  };
}

export function markAllNeedReview(result, reason) {
  return {
    ...result,
    needReview: true,
    reviewReason: reason,
    foodItems: result.foodItems.map(item => ({
      ...item,
      needReview: true,
      reviewReason: item.reviewReason || reason
    })),
    waterItems: result.waterItems.map(item => ({
      ...item,
      needReview: true,
      reviewReason: item.reviewReason || reason
    }))
  };
}